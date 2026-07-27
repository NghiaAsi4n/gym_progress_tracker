import {
  bodyWeightListQuerySchema,
  createBodyWeightRequestSchema,
  updateBodyWeightRequestSchema,
  type BodyWeight,
  type BodyWeightListQuery,
  type CreateBodyWeightRequest,
  type UpdateBodyWeightRequest,
} from "@gym-tracking/contracts";
import { Router, type RequestHandler } from "express";
import mongoose, { model, Schema, type Model } from "mongoose";

import { ApiError } from "../../shared/api-error.js";
import { validateInput } from "../../shared/validate.js";

export interface BodyWeightRecord {
  _id: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  measuredOn: string;
  weightKg: number;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<BodyWeightRecord>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    measuredOn: { type: String, required: true },
    weightKg: { type: Number, required: true, min: 20, max: 500 },
  },
  { collection: "bodyWeights", timestamps: true },
);
schema.index({ ownerId: 1, measuredOn: 1 }, { unique: true });

export const BodyWeightModel: Model<BodyWeightRecord> =
  (mongoose.models.BodyWeight as Model<BodyWeightRecord> | undefined) ??
  model<BodyWeightRecord>("BodyWeight", schema);

function present(record: BodyWeightRecord): BodyWeight {
  return {
    id: String(record._id),
    ownerId: String(record.ownerId),
    measuredOn: record.measuredOn,
    weightKg: record.weightKg,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function duplicateDate(error: unknown): never {
  if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
    throw new ApiError("CONFLICT", "A body-weight entry already exists for this date");
  }
  throw error;
}

export function createBodyWeightService() {
  return {
    async list(userId: string, query: BodyWeightListQuery) {
      const records = await BodyWeightModel.find({
        ownerId: userId,
        measuredOn: { $gte: query.from, $lte: query.to },
      })
        .sort({ measuredOn: 1 })
        .lean();
      return { data: records.map(present) };
    },
    async create(userId: string, input: CreateBodyWeightRequest) {
      try {
        const record = await BodyWeightModel.create({ ownerId: userId, ...input });
        return { data: present(record.toObject()) };
      } catch (error) {
        duplicateDate(error);
      }
    },
    async update(userId: string, id: string, input: UpdateBodyWeightRequest) {
      if (!mongoose.isValidObjectId(id)) throw new ApiError("NOT_FOUND", "Entry not found");
      try {
        const record = await BodyWeightModel.findOneAndUpdate(
          { _id: id, ownerId: userId },
          { $set: input },
          { returnDocument: "after", runValidators: true },
        ).lean();
        if (!record) throw new ApiError("NOT_FOUND", "Entry not found");
        return { data: present(record) };
      } catch (error) {
        duplicateDate(error);
      }
    },
    async delete(userId: string, id: string) {
      if (!mongoose.isValidObjectId(id)) throw new ApiError("NOT_FOUND", "Entry not found");
      const result = await BodyWeightModel.deleteOne({ _id: id, ownerId: userId });
      if (!result.deletedCount) throw new ApiError("NOT_FOUND", "Entry not found");
    },
  };
}

export function createBodyWeightRouter(
  authenticate: RequestHandler,
  service: ReturnType<typeof createBodyWeightService>,
) {
  const router = Router();
  router.use(authenticate);
  router.get("/", async (request, response) => {
    const query = validateInput(bodyWeightListQuerySchema, request.query);
    response.json(await service.list(request.auth!.userId, query));
  });
  router.post("/", async (request, response) => {
    const input = validateInput(createBodyWeightRequestSchema, request.body);
    response.status(201).json(await service.create(request.auth!.userId, input));
  });
  router.patch("/:id", async (request, response) => {
    const input = validateInput(updateBodyWeightRequestSchema, request.body);
    response.json(await service.update(request.auth!.userId, request.params.id, input));
  });
  router.delete("/:id", async (request, response) => {
    await service.delete(request.auth!.userId, request.params.id);
    response.status(204).end();
  });
  return router;
}
