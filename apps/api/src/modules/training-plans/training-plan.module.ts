import {
  acceptSuggestionRequestSchema,
  createTrainingPlanRequestSchema,
  scheduleOverrideRequestSchema,
  updateScheduleOverrideRequestSchema,
  updateTrainingPlanRequestSchema,
  type CreateTrainingPlanRequest,
  type ExerciseSuggestion,
  type ScheduledWorkout,
  type TrainingPlan,
  type UpdateTrainingPlanRequest,
} from "@gym-tracking/contracts";
import { Router, type RequestHandler } from "express";
import mongoose, { model, Schema, type Model } from "mongoose";
import { z } from "zod";

import { ApiError } from "../../shared/api-error.js";
import { validateInput } from "../../shared/validate.js";
import { ExerciseModel, type ExerciseRecord } from "../exercises/exercise.model.js";
import {
  WorkoutTemplateModel,
  type WorkoutTemplateService,
} from "../workout-templates/workout-template.module.js";
import { buildExerciseSuggestions } from "./suggestion.service.js";

interface PlanRecord extends Omit<CreateTrainingPlanRequest, "schedule"> {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  schedule: Array<{ dayOfWeek: string; templateId: mongoose.Types.ObjectId }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface OverrideRecord {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  scheduledDate: string;
  action: "SKIP" | "RESCHEDULE";
  rescheduledDate?: string;
}

const scheduleSchema = new Schema(
  {
    dayOfWeek: { type: String, required: true },
    templateId: { type: Schema.Types.ObjectId, ref: "WorkoutTemplate", required: true },
  },
  { _id: false },
);
const planSchema = new Schema<PlanRecord>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    goal: { type: String, required: true },
    experienceLevel: { type: String, required: true },
    daysPerWeek: { type: Number, required: true, min: 1, max: 7 },
    durationMinutes: { type: Number, required: true, min: 15, max: 180 },
    availableEquipment: [{ type: String, required: true }],
    schedule: { type: [scheduleSchema], required: true },
    isActive: { type: Boolean, default: true, required: true },
  },
  { collection: "trainingPlans", timestamps: true },
);
planSchema.index({ ownerId: 1, isActive: 1 });

const overrideSchema = new Schema<OverrideRecord>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    planId: { type: Schema.Types.ObjectId, ref: "TrainingPlan", required: true },
    scheduledDate: { type: String, required: true },
    action: { type: String, enum: ["SKIP", "RESCHEDULE"], required: true },
    rescheduledDate: String,
  },
  { collection: "scheduleOverrides", timestamps: true },
);
overrideSchema.index({ ownerId: 1, planId: 1, scheduledDate: 1 }, { unique: true });

export const TrainingPlanModel: Model<PlanRecord> =
  (mongoose.models.TrainingPlan as Model<PlanRecord> | undefined) ??
  model<PlanRecord>("TrainingPlan", planSchema);
export const ScheduleOverrideModel: Model<OverrideRecord> =
  (mongoose.models.ScheduleOverride as Model<OverrideRecord> | undefined) ??
  model<OverrideRecord>("ScheduleOverride", overrideSchema);

const calendarQuerySchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    timeZone: z.string().min(1).max(100),
  })
  .strict()
  .refine(({ from, to }) => from <= to, { message: "from must not be after to" });

const DAYS = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

function present(record: PlanRecord): TrainingPlan {
  return {
    id: String(record._id),
    ownerId: String(record.ownerId),
    name: record.name,
    goal: record.goal,
    experienceLevel: record.experienceLevel,
    daysPerWeek: record.daysPerWeek,
    durationMinutes: record.durationMinutes,
    availableEquipment: record.availableEquipment,
    schedule: record.schedule.map(({ dayOfWeek, templateId }) => ({
      dayOfWeek: dayOfWeek as TrainingPlan["schedule"][number]["dayOfWeek"],
      templateId: String(templateId),
    })),
    isActive: record.isActive,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  for (
    let cursor = new Date(`${from}T00:00:00.000Z`);
    cursor <= new Date(`${to}T00:00:00.000Z`);
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    dates.push(cursor.toISOString().slice(0, 10));
  }
  return dates;
}

export function createTrainingPlanService(templateService: WorkoutTemplateService) {
  async function findOwned(userId: string, id: string): Promise<PlanRecord> {
    if (!mongoose.isValidObjectId(id)) throw new ApiError("NOT_FOUND", "Training plan not found");
    const plan = await TrainingPlanModel.findOne({ _id: id, ownerId: userId }).lean();
    if (!plan) throw new ApiError("NOT_FOUND", "Training plan not found");
    return plan;
  }

  async function validateTemplates(
    userId: string,
    schedule: Array<{ templateId: string }>,
  ): Promise<void> {
    const ids = [...new Set(schedule.map(({ templateId }) => templateId))];
    const count = await WorkoutTemplateModel.countDocuments({ _id: { $in: ids }, ownerId: userId });
    if (count !== ids.length) {
      throw new ApiError("VALIDATION_ERROR", "One or more templates are unavailable");
    }
  }

  async function suggestions(userId: string, planId: string): Promise<ExerciseSuggestion[]> {
    const plan = await findOwned(userId, planId);
    const templates = await WorkoutTemplateModel.find({
      _id: { $in: plan.schedule.map(({ templateId }) => templateId) },
      ownerId: userId,
    }).lean();
    const existingIds = new Set(templates.flatMap(({ exerciseIds }) => exerciseIds.map(String)));
    const existing = await ExerciseModel.find({ _id: { $in: [...existingIds] } }).lean();
    const existingPatterns = new Set(existing.map(({ movementPattern }) => movementPattern));
    const candidates = await ExerciseModel.find({
      _id: { $nin: [...existingIds] },
      $or: [{ isSystem: true }, { ownerId: userId }],
    }).lean<ExerciseRecord[]>();
    const firstSchedule = plan.schedule[0];
    return buildExerciseSuggestions({
      availableEquipment: plan.availableEquipment,
      candidates: candidates.map((exercise) => ({
        id: String(exercise._id),
        name: exercise.name,
        movementPattern: exercise.movementPattern,
        equipment: exercise.equipment,
        difficulty: exercise.difficulty,
      })),
      existingExerciseIds: [...existingIds],
      existingPatterns: [...existingPatterns],
      goal: plan.goal,
      suggestedTemplateId: firstSchedule ? String(firstSchedule.templateId) : null,
      suggestedDay: firstSchedule?.dayOfWeek ?? null,
    });
  }

  return {
    async list(userId: string) {
      return {
        data: (
          await TrainingPlanModel.find({ ownerId: userId }).sort({ updatedAt: -1 }).lean()
        ).map(present),
      };
    },
    async get(userId: string, id: string) {
      return { data: present(await findOwned(userId, id)) };
    },
    async create(userId: string, input: CreateTrainingPlanRequest) {
      await validateTemplates(userId, input.schedule);
      await TrainingPlanModel.updateMany({ ownerId: userId, isActive: true }, { isActive: false });
      const plan = await TrainingPlanModel.create({ ...input, ownerId: userId, isActive: true });
      return { data: present(plan.toObject()) };
    },
    async update(userId: string, id: string, input: UpdateTrainingPlanRequest) {
      const current = await findOwned(userId, id);
      const nextSchedule =
        input.schedule ??
        current.schedule.map(({ dayOfWeek, templateId }) => ({
          dayOfWeek: dayOfWeek as TrainingPlan["schedule"][number]["dayOfWeek"],
          templateId: String(templateId),
        }));
      const nextDays = input.daysPerWeek ?? current.daysPerWeek;
      if (nextDays !== nextSchedule.length) {
        throw new ApiError("VALIDATION_ERROR", "daysPerWeek must match scheduled days");
      }
      await validateTemplates(userId, nextSchedule);
      if (input.isActive) {
        await TrainingPlanModel.updateMany(
          { ownerId: userId, _id: { $ne: id }, isActive: true },
          { isActive: false },
        );
      }
      const plan = await TrainingPlanModel.findOneAndUpdate(
        { _id: id, ownerId: userId },
        { $set: input },
        { returnDocument: "after", runValidators: true },
      ).lean();
      if (!plan) throw new ApiError("NOT_FOUND", "Training plan not found");
      return { data: present(plan) };
    },
    async delete(userId: string, id: string) {
      const result = await TrainingPlanModel.deleteOne({ _id: id, ownerId: userId });
      if (!result.deletedCount) throw new ApiError("NOT_FOUND", "Training plan not found");
      await ScheduleOverrideModel.deleteMany({ ownerId: userId, planId: id });
    },
    async calendar(userId: string, query: z.infer<typeof calendarQuerySchema>) {
      try {
        new Intl.DateTimeFormat("en", { timeZone: query.timeZone });
      } catch {
        throw new ApiError("VALIDATION_ERROR", "Invalid timeZone");
      }
      const plan = await TrainingPlanModel.findOne({ ownerId: userId, isActive: true }).lean();
      if (!plan) return { data: [] };
      const templateIds = plan.schedule.map(({ templateId }) => templateId);
      const templates = await WorkoutTemplateModel.find({
        _id: { $in: templateIds },
        ownerId: userId,
      }).lean();
      const names = new Map(templates.map(({ _id, name }) => [String(_id), name]));
      const overrides = await ScheduleOverrideModel.find({
        ownerId: userId,
        planId: plan._id,
        scheduledDate: { $gte: query.from, $lte: query.to },
      }).lean();
      const overrideByDate = new Map(
        overrides.map((override) => [override.scheduledDate, override]),
      );
      const scheduleByDay = new Map(plan.schedule.map((item) => [item.dayOfWeek, item]));
      const data: ScheduledWorkout[] = [];
      for (const date of dateRange(query.from, query.to)) {
        const day = DAYS[new Date(`${date}T00:00:00.000Z`).getUTCDay()]!;
        const item = scheduleByDay.get(day);
        if (!item) continue;
        const override = overrideByDate.get(date);
        if (override?.action === "SKIP") continue;
        const scheduledDate = override?.rescheduledDate ?? date;
        if (scheduledDate < query.from || scheduledDate > query.to) continue;
        data.push({
          planId: String(plan._id),
          planName: plan.name,
          templateId: String(item.templateId),
          templateName: names.get(String(item.templateId)) ?? "Unavailable template",
          scheduledDate,
          status: override ? "RESCHEDULED" : "SCHEDULED",
        });
      }
      return { data: data.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)) };
    },
    async createOverride(userId: string, input: z.infer<typeof scheduleOverrideRequestSchema>) {
      await findOwned(userId, input.planId);
      const override = await ScheduleOverrideModel.findOneAndUpdate(
        { ownerId: userId, planId: input.planId, scheduledDate: input.scheduledDate },
        { $set: { ...input, ownerId: userId } },
        { upsert: true, returnDocument: "after", runValidators: true },
      ).lean();
      return { data: override };
    },
    async updateOverride(
      userId: string,
      id: string,
      input: z.infer<typeof updateScheduleOverrideRequestSchema>,
    ) {
      const override = await ScheduleOverrideModel.findOneAndUpdate(
        { _id: id, ownerId: userId },
        { $set: input, ...(input.action === "SKIP" ? { $unset: { rescheduledDate: 1 } } : {}) },
        { returnDocument: "after", runValidators: true },
      ).lean();
      if (!override) throw new ApiError("NOT_FOUND", "Schedule override not found");
      return { data: override };
    },
    async deleteOverride(userId: string, id: string) {
      const result = await ScheduleOverrideModel.deleteOne({ _id: id, ownerId: userId });
      if (!result.deletedCount) throw new ApiError("NOT_FOUND", "Schedule override not found");
    },
    async listSuggestions(userId: string, planId: string) {
      return { data: await suggestions(userId, planId) };
    },
    async acceptSuggestion(userId: string, planId: string, exerciseId: string, templateId: string) {
      const allowed = (await suggestions(userId, planId)).some(
        (suggestion) => suggestion.exerciseId === exerciseId,
      );
      if (!allowed) throw new ApiError("VALIDATION_ERROR", "Suggestion is no longer available");
      const template = await templateService.get(userId, templateId);
      return templateService.update(userId, templateId, {
        exerciseIds: [...template.data.exercises.map((item) => item.exerciseId), exerciseId],
      });
    },
    findOwned,
  };
}

export function createTrainingPlanRouter(
  authenticate: RequestHandler,
  service: ReturnType<typeof createTrainingPlanService>,
) {
  const router = Router();
  router.use(authenticate);
  router.get("/", async (request, response) =>
    response.json(await service.list(request.auth!.userId)),
  );
  router.post("/", async (request, response) => {
    const input = validateInput(createTrainingPlanRequestSchema, request.body);
    response.status(201).json(await service.create(request.auth!.userId, input));
  });
  router.get("/:id/suggestions", async (request, response) =>
    response.json(await service.listSuggestions(request.auth!.userId, request.params.id)),
  );
  router.post("/:id/suggestions/:exerciseId/accept", async (request, response) => {
    const input = validateInput(acceptSuggestionRequestSchema, request.body);
    response.json(
      await service.acceptSuggestion(
        request.auth!.userId,
        request.params.id,
        request.params.exerciseId,
        input.templateId,
      ),
    );
  });
  router.get("/:id", async (request, response) =>
    response.json(await service.get(request.auth!.userId, request.params.id)),
  );
  router.patch("/:id", async (request, response) => {
    const input = validateInput(updateTrainingPlanRequestSchema, request.body);
    response.json(await service.update(request.auth!.userId, request.params.id, input));
  });
  router.delete("/:id", async (request, response) => {
    await service.delete(request.auth!.userId, request.params.id);
    response.status(204).end();
  });
  return router;
}

export function createScheduleRouter(
  authenticate: RequestHandler,
  service: ReturnType<typeof createTrainingPlanService>,
) {
  const scheduled = Router();
  scheduled.get("/", authenticate, async (request, response) => {
    const query = validateInput(calendarQuerySchema, request.query);
    response.json(await service.calendar(request.auth!.userId, query));
  });
  const overrides = Router();
  overrides.use(authenticate);
  overrides.post("/", async (request, response) => {
    const input = validateInput(scheduleOverrideRequestSchema, request.body);
    response.status(201).json(await service.createOverride(request.auth!.userId, input));
  });
  overrides.patch("/:id", async (request, response) => {
    const input = validateInput(updateScheduleOverrideRequestSchema, request.body);
    response.json(await service.updateOverride(request.auth!.userId, request.params.id, input));
  });
  overrides.delete("/:id", async (request, response) => {
    await service.deleteOverride(request.auth!.userId, request.params.id);
    response.status(204).end();
  });
  return { overrides, scheduled };
}
