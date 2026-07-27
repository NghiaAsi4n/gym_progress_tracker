import mongoose from "mongoose";

import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { createPasswordService } from "../modules/auth/password.service.js";
import { BodyWeightModel } from "../modules/body-weight/body-weight.module.js";
import { ExerciseModel } from "../modules/exercises/exercise.model.js";
import { createExerciseRepository } from "../modules/exercises/exercise.repository.js";
import { systemExercises } from "../modules/exercises/exercise.seed.js";
import { TrainingPlanModel } from "../modules/training-plans/training-plan.module.js";
import { UserModel } from "../modules/users/user.model.js";
import { WorkoutTemplateModel } from "../modules/workout-templates/workout-template.module.js";
import { WorkoutModel } from "../modules/workouts/workout.model.js";

const DEMO_EMAIL = "demo@gym.local";
const DEMO_PASSWORD = "DemoPassword1!";
const DEMO_TEMPLATE = "Demo full body";
const DEMO_PLAN = "Demo strength plan";

async function seedDemoUser() {
  const passwordHash = await createPasswordService({ cost: 2 ** 14 }).hash(DEMO_PASSWORD);
  return UserModel.findOneAndUpdate(
    { normalizedEmail: DEMO_EMAIL },
    {
      $setOnInsert: {
        normalizedEmail: DEMO_EMAIL,
        passwordHash,
        preferences: { locale: "vi", theme: "SYSTEM", unit: "KG" },
      },
    },
    { new: true, runValidators: true, upsert: true },
  ).orFail();
}

async function seedDemoData(ownerId: mongoose.Types.ObjectId): Promise<void> {
  const exercises = await ExerciseModel.find({
    isSystem: true,
    name: { $in: ["Barbell Back Squat", "Barbell Bench Press", "Barbell Bent-Over Row"] },
  }).lean();
  const byName = new Map(exercises.map((exercise) => [exercise.name, exercise]));
  const selected = [
    byName.get("Barbell Back Squat"),
    byName.get("Barbell Bench Press"),
    byName.get("Barbell Bent-Over Row"),
  ];
  if (selected.some((exercise) => !exercise)) {
    throw new Error("Required system exercises were not seeded");
  }

  const exerciseIds = selected.map((exercise) => exercise!._id);
  const template = await WorkoutTemplateModel.findOneAndUpdate(
    { name: DEMO_TEMPLATE, ownerId },
    { $set: { exerciseIds }, $setOnInsert: { name: DEMO_TEMPLATE, ownerId } },
    { new: true, runValidators: true, upsert: true },
  ).orFail();

  await TrainingPlanModel.findOneAndUpdate(
    { name: DEMO_PLAN, ownerId },
    {
      $set: {
        availableEquipment: ["BARBELL", "BODYWEIGHT"],
        daysPerWeek: 3,
        durationMinutes: 60,
        experienceLevel: "BEGINNER",
        goal: "GENERAL",
        isActive: true,
        schedule: [
          { dayOfWeek: "MONDAY", templateId: template._id },
          { dayOfWeek: "WEDNESDAY", templateId: template._id },
          { dayOfWeek: "FRIDAY", templateId: template._id },
        ],
      },
      $setOnInsert: { name: DEMO_PLAN, ownerId },
    },
    { new: true, runValidators: true, upsert: true },
  );

  const bodyWeights: Array<readonly [string, number]> = [
    ["2026-07-01", 76.8],
    ["2026-07-08", 76.2],
    ["2026-07-15", 75.7],
    ["2026-07-22", 75.3],
  ];
  await BodyWeightModel.bulkWrite(
    bodyWeights.map(([measuredOn, weightKg]) => ({
      updateOne: {
        filter: { measuredOn, ownerId },
        update: { $set: { weightKg }, $setOnInsert: { measuredOn, ownerId } },
        upsert: true,
      },
    })),
  );

  const workoutSeeds = [
    { marker: "Demo workout A", startedAt: "2026-07-10T11:00:00.000Z", weight: 45 },
    { marker: "Demo workout B", startedAt: "2026-07-17T11:00:00.000Z", weight: 50 },
  ];
  for (const seed of workoutSeeds) {
    const startedAt = new Date(seed.startedAt);
    const completedAt = new Date(startedAt.getTime() + 3_600_000);
    const workoutExercises = selected.map((exercise, exerciseOrder) => ({
      exerciseId: exercise!._id,
      id: new mongoose.Types.ObjectId(),
      name: exercise!.name,
      order: exerciseOrder,
      sets: [0, 1, 2].map((order) => ({
        id: new mongoose.Types.ObjectId(),
        isComplete: true,
        notes: "",
        order,
        reps: 8,
        weightKg: seed.weight,
      })),
    }));
    await WorkoutModel.findOneAndUpdate(
      { notes: seed.marker, ownerId },
      {
        $set: {
          completedAt,
          durationSeconds: 3_600,
          exercises: workoutExercises,
          source: {
            templateId: template._id,
            templateName: template.name,
            type: "TEMPLATE",
          },
          startedAt,
          status: "COMPLETED",
          version: 1,
          volumeKg: selected.length * 3 * 8 * seed.weight,
        },
        $setOnInsert: { notes: seed.marker, ownerId },
      },
      { new: true, runValidators: true, upsert: true },
    );
  }
}

async function main(): Promise<void> {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("Demo seed is disabled in production");
  }
  const uri = process.env["MONGODB_URI"] ?? "mongodb://127.0.0.1:27017/gym_tracking";
  await connectDatabase(uri);
  await createExerciseRepository().seedSystemExercises(systemExercises);
  const user = await seedDemoUser();
  await seedDemoData(user._id);
  console.info(`Seed complete. Demo account: ${DEMO_EMAIL}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
