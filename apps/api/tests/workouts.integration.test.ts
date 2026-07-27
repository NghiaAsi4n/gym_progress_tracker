import {
  authResponseSchema,
  exerciseResponseSchema,
  workoutResponseSchema,
  workoutTemplateResponseSchema,
} from "@gym-tracking/contracts";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { RefreshSessionModel } from "../src/modules/auth/refresh-session.model.js";
import { ExerciseModel } from "../src/modules/exercises/exercise.model.js";
import { UserModel } from "../src/modules/users/user.model.js";
import { WorkoutTemplateModel } from "../src/modules/workout-templates/workout-template.module.js";
import { WorkoutModel } from "../src/modules/workouts/workout.model.js";
import { TEST_AUTH_CONFIG, TEST_WEB_ORIGIN } from "./test-config.js";

const TEST_MONGODB_URI =
  process.env.TEST_WORKOUT_MONGODB_URI ?? "mongodb://127.0.0.1:27017/gym_tracking_workouts_test";

if (!/_test(?:\?|$)/.test(TEST_MONGODB_URI)) {
  throw new Error("TEST_WORKOUT_MONGODB_URI must target a database ending in _test");
}

const app = createApp({
  auth: TEST_AUTH_CONFIG,
  databaseStatus: () => "connected",
  webOrigin: TEST_WEB_ORIGIN,
});

async function register(email: string): Promise<string> {
  const response = await request(app)
    .post("/api/v1/auth/register")
    .set("Origin", TEST_WEB_ORIGIN)
    .send({ email, password: "WorkoutPassword1!" });

  expect(response.status).toBe(201);
  return authResponseSchema.parse(response.body).data.accessToken;
}

beforeAll(async () => {
  await connectDatabase(TEST_MONGODB_URI);
  await Promise.all([
    UserModel.syncIndexes(),
    RefreshSessionModel.syncIndexes(),
    ExerciseModel.syncIndexes(),
    WorkoutTemplateModel.syncIndexes(),
    WorkoutModel.syncIndexes(),
  ]);
});

beforeEach(async () => {
  await Promise.all([
    WorkoutModel.deleteMany({}),
    WorkoutTemplateModel.deleteMany({}),
    ExerciseModel.deleteMany({}),
    RefreshSessionModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);
});

afterAll(async () => {
  await Promise.all([
    WorkoutModel.deleteMany({}),
    WorkoutTemplateModel.deleteMany({}),
    ExerciseModel.deleteMany({}),
    RefreshSessionModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);
  await disconnectDatabase();
});

describe("workout draft API", () => {
  it("starts an empty workout with editable blank notes", async () => {
    const token = await register("empty-workout@example.com");

    const response = await request(app)
      .post("/api/v1/workouts/draft")
      .set("Authorization", `Bearer ${token}`)
      .send({ source: { type: "EMPTY" } });

    expect(response.status).toBe(201);
    expect(workoutResponseSchema.parse(response.body).data).toMatchObject({
      exercises: [],
      notes: "",
      source: { type: "EMPTY" },
      status: "ACTIVE",
    });
  });

  it("starts a template workout whose default sets have blank notes", async () => {
    const token = await register("template-workout@example.com");
    const exercise = await request(app)
      .post("/api/v1/exercises")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Template Press",
        muscleGroups: ["CHEST"],
        movementPattern: "PUSH",
        equipment: "DUMBBELL",
        difficulty: "BEGINNER",
      });
    const template = await request(app)
      .post("/api/v1/workout-templates")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Push workout",
        exerciseIds: [exerciseResponseSchema.parse(exercise.body).data.id],
      });

    const response = await request(app)
      .post("/api/v1/workouts/draft")
      .set("Authorization", `Bearer ${token}`)
      .send({
        source: {
          type: "TEMPLATE",
          templateId: workoutTemplateResponseSchema.parse(template.body).data.id,
        },
      });

    expect(response.status).toBe(201);
    const workout = workoutResponseSchema.parse(response.body).data;
    expect(workout.exercises).toHaveLength(1);
    expect(workout.exercises[0]?.sets.map(({ notes }) => notes)).toEqual(["", "", ""]);
  });

  it("permanently deletes a cancelled workout from its owner's history", async () => {
    const token = await register("delete-history@example.com");
    const draft = await request(app)
      .post("/api/v1/workouts/draft")
      .set("Authorization", `Bearer ${token}`)
      .send({ source: { type: "EMPTY" } });
    const workout = workoutResponseSchema.parse(draft.body).data;

    const cancelled = await request(app)
      .post(`/api/v1/workouts/${workout.id}/cancel`)
      .set("Authorization", `Bearer ${token}`)
      .send({ version: workout.version });

    expect(cancelled.status).toBe(200);
    const deleted = await request(app)
      .delete(`/api/v1/workouts/${workout.id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleted.status).toBe(204);
    const history = await request(app)
      .get("/api/v1/workouts")
      .set("Authorization", `Bearer ${token}`);
    expect(history.body.data).toEqual([]);
  });
});
