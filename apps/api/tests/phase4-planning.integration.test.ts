/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { connectDatabase } from "../src/config/database.js";
import { ExerciseModel } from "../src/modules/exercises/exercise.model.js";
import { createExerciseRepository } from "../src/modules/exercises/exercise.repository.js";
import { systemExercises } from "../src/modules/exercises/exercise.seed.js";
import { TEST_AUTH_CONFIG, TEST_WEB_ORIGIN } from "./test-config.js";

const TEST_MONGODB_URI =
  process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017/gym_tracking_phase4_test";

if (!/_test(?:\?|$)/.test(TEST_MONGODB_URI)) {
  throw new Error("TEST_MONGODB_URI must target a database ending in _test");
}

function buildApp() {
  return createApp({
    auth: TEST_AUTH_CONFIG,
    databaseStatus: () => "connected",
    webOrigin: TEST_WEB_ORIGIN,
  });
}

async function tokenFor(suffix: string) {
  const email = `planning-${suffix}-${Date.now()}@test.com`;
  const password = "Password1!";
  await request(buildApp())
    .post("/api/v1/auth/register")
    .set("Origin", TEST_WEB_ORIGIN)
    .send({ email, password });
  const response = await request(buildApp())
    .post("/api/v1/auth/login")
    .set("Origin", TEST_WEB_ORIGIN)
    .send({ email, password });
  return response.body.data.accessToken as string;
}

async function firstSystemExerciseId(token: string) {
  const response = await request(buildApp())
    .get("/api/v1/exercises?pageSize=1")
    .set("Authorization", `Bearer ${token}`);
  return response.body.data[0].id as string;
}

async function createTemplate(token: string, name = "Push day") {
  const exerciseId = await firstSystemExerciseId(token);
  return request(buildApp())
    .post("/api/v1/workout-templates")
    .set("Authorization", `Bearer ${token}`)
    .send({ name, exerciseIds: [exerciseId] });
}

beforeAll(async () => {
  await connectDatabase(TEST_MONGODB_URI);
  await ExerciseModel.deleteMany({});
  await ExerciseModel.syncIndexes();
  await createExerciseRepository().seedSystemExercises(systemExercises);
});

describe("workout templates", () => {
  it("creates, reads and reorders an owned template", async () => {
    const token = await tokenFor("template");
    const exercises = await request(buildApp())
      .get("/api/v1/exercises?pageSize=2")
      .set("Authorization", `Bearer ${token}`);
    const exerciseIds = (exercises.body.data as Array<{ id: string }>).map(({ id }) => id);

    const created = await request(buildApp())
      .post("/api/v1/workout-templates")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Full body", exerciseIds });
    expect(created.status).toBe(201);
    expect(
      created.body.data.exercises.map((item: { exerciseId: string }) => item.exerciseId),
    ).toEqual(exerciseIds);

    const reordered = await request(buildApp())
      .patch(`/api/v1/workout-templates/${created.body.data.id as string}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ exerciseIds: [...exerciseIds].reverse() });
    expect(reordered.status).toBe(200);
    expect(reordered.body.data.exercises[0].exerciseId).toBe(exerciseIds[1]);
  });

  it("rejects unavailable references and hides another user's template", async () => {
    const ownerToken = await tokenFor("owner");
    const otherToken = await tokenFor("other");
    const created = await createTemplate(ownerToken, "Private template");

    const invalid = await request(buildApp())
      .post("/api/v1/workout-templates")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Invalid", exerciseIds: ["507f1f77bcf86cd799439011"] });
    expect(invalid.status).toBe(422);

    const hidden = await request(buildApp())
      .get(`/api/v1/workout-templates/${created.body.data.id as string}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(hidden.status).toBe(404);
  });

  it("returns conflict when deleting a custom exercise used by a template", async () => {
    const token = await tokenFor("conflict");
    const custom = await request(buildApp())
      .post("/api/v1/exercises")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Template custom",
        muscleGroups: ["CORE"],
        movementPattern: "ISOLATION",
        equipment: "BODYWEIGHT",
        difficulty: "BEGINNER",
      });
    await request(buildApp())
      .post("/api/v1/workout-templates")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Uses custom", exerciseIds: [custom.body.data.id] });

    const response = await request(buildApp())
      .delete(`/api/v1/exercises/${custom.body.data.id as string}`)
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(409);
  });
});

describe("training plans and suggestions", () => {
  it("enforces training-plan ownership", async () => {
    const ownerToken = await tokenFor("plan-owner");
    const otherToken = await tokenFor("plan-other");
    const template = await createTemplate(ownerToken, "Owner template");
    const plan = await request(buildApp())
      .post("/api/v1/training-plans")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        name: "Private plan",
        goal: "GENERAL",
        experienceLevel: "BEGINNER",
        daysPerWeek: 1,
        durationMinutes: 30,
        availableEquipment: ["BODYWEIGHT"],
        schedule: [{ dayOfWeek: "MONDAY", templateId: template.body.data.id }],
      });

    await request(buildApp())
      .get(`/api/v1/training-plans/${plan.body.data.id as string}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(404);
    await request(buildApp())
      .patch(`/api/v1/training-plans/${plan.body.data.id as string}`)
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ isActive: true })
      .expect(404);
  });

  it("creates an active plan, expands its weekly calendar and applies an override", async () => {
    const token = await tokenFor("calendar");
    const template = await createTemplate(token);
    const plan = await request(buildApp())
      .post("/api/v1/training-plans")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Strength plan",
        goal: "STRENGTH",
        experienceLevel: "INTERMEDIATE",
        daysPerWeek: 1,
        durationMinutes: 60,
        availableEquipment: ["BARBELL"],
        schedule: [{ dayOfWeek: "MONDAY", templateId: template.body.data.id }],
      });
    expect(plan.status).toBe(201);
    expect(plan.body.data.isActive).toBe(true);

    const calendar = await request(buildApp())
      .get("/api/v1/scheduled-workouts?from=2026-07-27&to=2026-08-03&timeZone=Asia%2FBangkok")
      .set("Authorization", `Bearer ${token}`);
    expect(calendar.status).toBe(200);
    expect(calendar.body.data.map((item: { scheduledDate: string }) => item.scheduledDate)).toEqual(
      ["2026-07-27", "2026-08-03"],
    );

    await request(buildApp())
      .post("/api/v1/schedule-overrides")
      .set("Authorization", `Bearer ${token}`)
      .send({
        planId: plan.body.data.id,
        scheduledDate: "2026-07-27",
        action: "RESCHEDULE",
        rescheduledDate: "2026-07-28",
      })
      .expect(201);
    const overridden = await request(buildApp())
      .get("/api/v1/scheduled-workouts?from=2026-07-27&to=2026-08-03&timeZone=Asia%2FBangkok")
      .set("Authorization", `Bearer ${token}`);
    expect(overridden.body.data[0]).toMatchObject({
      scheduledDate: "2026-07-28",
      status: "RESCHEDULED",
    });
  });

  it("returns stable equipment-compatible suggestions and mutates only after acceptance", async () => {
    const token = await tokenFor("suggestions");
    const template = await createTemplate(token, "Starter");
    const plan = await request(buildApp())
      .post("/api/v1/training-plans")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Bodyweight plan",
        goal: "GENERAL",
        experienceLevel: "BEGINNER",
        daysPerWeek: 1,
        durationMinutes: 30,
        availableEquipment: ["BODYWEIGHT"],
        schedule: [{ dayOfWeek: "MONDAY", templateId: template.body.data.id }],
      });

    const path = `/api/v1/training-plans/${plan.body.data.id as string}/suggestions`;
    const otherToken = await tokenFor("suggestion-other");
    await request(buildApp())
      .get(path)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(404);
    const first = await request(buildApp()).get(path).set("Authorization", `Bearer ${token}`);
    const second = await request(buildApp()).get(path).set("Authorization", `Bearer ${token}`);
    expect(first.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(
      (first.body.data as Array<{ exerciseName: string }>).some(
        ({ exerciseName }) => exerciseName === "Push-Up",
      ),
    ).toBe(true);

    const before = await request(buildApp())
      .get(`/api/v1/workout-templates/${template.body.data.id as string}`)
      .set("Authorization", `Bearer ${token}`);
    expect(before.body.data.exercises).toHaveLength(1);

    await request(buildApp())
      .post(`${path}/${first.body.data[0].exerciseId as string}/accept`)
      .set("Authorization", `Bearer ${token}`)
      .send({ templateId: template.body.data.id })
      .expect(200);
    const after = await request(buildApp())
      .get(`/api/v1/workout-templates/${template.body.data.id as string}`)
      .set("Authorization", `Bearer ${token}`);
    expect(after.body.data.exercises).toHaveLength(2);
  });
});
