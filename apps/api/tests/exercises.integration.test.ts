import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { ExerciseModel } from "../src/modules/exercises/exercise.model.js";
import { createExerciseRepository } from "../src/modules/exercises/exercise.repository.js";
import { systemExercises } from "../src/modules/exercises/exercise.seed.js";
import { UserModel } from "../src/modules/users/user.model.js";
import { TEST_AUTH_CONFIG, TEST_WEB_ORIGIN } from "./test-config.js";

const TEST_MONGODB_URI =
  process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017/gym_tracking_phase3_test";

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

beforeAll(async () => {
  await connectDatabase(TEST_MONGODB_URI);
  await UserModel.syncIndexes();
  await ExerciseModel.deleteMany({});
  await ExerciseModel.syncIndexes();
  await createExerciseRepository().seedSystemExercises(systemExercises);
});

afterAll(async () => {
  await disconnectDatabase();
});

beforeEach(async () => {
  await ExerciseModel.deleteMany({ isSystem: false });
});

async function registerAndLogin(suffix = "") {
  const app = buildApp();
  const email = `exercise${suffix}${Date.now()}@test.com`;
  const password = "Password1!";
  await request(app)
    .post("/api/v1/auth/register")
    .set("Origin", TEST_WEB_ORIGIN)
    .send({ email, password });
  const login = await request(app)
    .post("/api/v1/auth/login")
    .set("Origin", TEST_WEB_ORIGIN)
    .send({ email, password });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return login.body.data.accessToken as string;
}

describe("GET /api/v1/exercises", () => {
  it("returns 401 without auth", async () => {
    const res = await request(buildApp()).get("/api/v1/exercises");
    expect(res.status).toBe(401);
  });

  it("returns system exercises for authenticated user", async () => {
    const token = await registerAndLogin();
    const res = await request(buildApp())
      .get("/api/v1/exercises")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(res.body.data).toBeInstanceOf(Array);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect((res.body.data as unknown[]).length).toBeGreaterThan(0);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(res.body.pagination).toMatchObject({ page: 1, pageSize: 20 });
  });

  it("combines system and owned exercises without leaking another user's custom exercises", async () => {
    const tokenA = await registerAndLogin("_list_a");
    const tokenB = await registerAndLogin("_list_b");
    const app = buildApp();

    await request(app)
      .post("/api/v1/exercises")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        name: "Owned List Exercise",
        muscleGroups: ["CORE"],
        movementPattern: "ISOLATION",
        equipment: "BODYWEIGHT",
        difficulty: "BEGINNER",
      });
    await request(app)
      .post("/api/v1/exercises")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({
        name: "Private List Exercise",
        muscleGroups: ["CORE"],
        movementPattern: "ISOLATION",
        equipment: "BODYWEIGHT",
        difficulty: "BEGINNER",
      });

    const response = await request(app)
      .get("/api/v1/exercises?pageSize=100")
      .set("Authorization", `Bearer ${tokenA}`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const names = (response.body.data as Array<{ name: string }>).map(({ name }) => name);

    expect(response.status).toBe(200);
    expect(names).toContain("Owned List Exercise");
    expect(names).toContain("Barbell Bench Press");
    expect(names).not.toContain("Private List Exercise");
  });

  it("filters by muscleGroup", async () => {
    const token = await registerAndLogin();
    const res = await request(buildApp())
      .get("/api/v1/exercises?muscleGroup=CHEST")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    for (const exercise of res.body.data as Array<{ muscleGroups: string[] }>) {
      expect(exercise.muscleGroups).toContain("CHEST");
    }
  });

  it("filters by name (partial match)", async () => {
    const token = await registerAndLogin();
    const res = await request(buildApp())
      .get("/api/v1/exercises?name=Deadlift")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect((res.body.data as unknown[]).length).toBeGreaterThan(0);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    for (const exercise of res.body.data as Array<{ name: string }>) {
      expect(exercise.name.toLowerCase()).toContain("deadlift");
    }
  });

  it("treats regex metacharacters in name search as literal text", async () => {
    const token = await registerAndLogin("_literal_search");
    const response = await request(buildApp())
      .get("/api/v1/exercises?name=%5B")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(response.body.data).toEqual([]);
  });

  it("paginates results", async () => {
    const token = await registerAndLogin();
    const res = await request(buildApp())
      .get("/api/v1/exercises?page=1&pageSize=3")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect((res.body.data as unknown[]).length).toBeLessThanOrEqual(3);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(res.body.pagination.pageSize).toBe(3);
  });
});

describe("POST /api/v1/exercises", () => {
  it("returns 401 without auth", async () => {
    const res = await request(buildApp())
      .post("/api/v1/exercises")
      .send({
        name: "Test Exercise",
        muscleGroups: ["CHEST"],
        movementPattern: "PUSH",
        equipment: "BARBELL",
        difficulty: "BEGINNER",
      });
    expect(res.status).toBe(401);
  });

  it("creates a custom exercise", async () => {
    const token = await registerAndLogin();
    const res = await request(buildApp())
      .post("/api/v1/exercises")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "My Custom Press",
        muscleGroups: ["CHEST", "TRICEPS"],
        movementPattern: "PUSH",
        equipment: "DUMBBELL",
        difficulty: "BEGINNER",
      });
    expect(res.status).toBe(201);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(res.body.data).toMatchObject({
      name: "My Custom Press",
      muscleGroups: ["CHEST", "TRICEPS"],
      isSystem: false,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(res.body.data.id).toBeDefined();
  });

  it("returns 409 for duplicate name (same user)", async () => {
    const app = buildApp();
    const token = await registerAndLogin();
    const payload = {
      name: "Unique Exercise",
      muscleGroups: ["BACK"],
      movementPattern: "PULL",
      equipment: "CABLE",
      difficulty: "INTERMEDIATE",
    };
    await request(app)
      .post("/api/v1/exercises")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    const res = await request(app)
      .post("/api/v1/exercises")
      .set("Authorization", `Bearer ${token}`)
      .send(payload);
    expect(res.status).toBe(409);
  });

  it("returns 400 for invalid input", async () => {
    const token = await registerAndLogin();
    const res = await request(buildApp())
      .post("/api/v1/exercises")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "" });
    expect(res.status).toBe(422);
  });
});

describe("GET /api/v1/exercises/:id", () => {
  it("returns a system exercise by id", async () => {
    const token = await registerAndLogin();
    const app = buildApp();
    const list = await request(app)
      .get("/api/v1/exercises?pageSize=1")
      .set("Authorization", `Bearer ${token}`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const id = (list.body.data as Array<{ id: string }>)[0]!.id;

    const res = await request(app)
      .get(`/api/v1/exercises/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(res.body.data.id).toBe(id);
  });

  it("returns 404 for unknown id", async () => {
    const token = await registerAndLogin();
    const fakeId = new mongoose.Types.ObjectId().toHexString();
    const res = await request(buildApp())
      .get(`/api/v1/exercises/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for a malformed exercise id", async () => {
    const token = await registerAndLogin("_malformed_id");
    const response = await request(buildApp())
      .get("/api/v1/exercises/not-an-object-id")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(404);
  });

  it("returns 404 when accessing another user's exercise", async () => {
    const tokenA = await registerAndLogin("_a");
    const tokenB = await registerAndLogin("_b");
    const app = buildApp();

    const created = await request(app)
      .post("/api/v1/exercises")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        name: "Private Exercise",
        muscleGroups: ["CORE"],
        movementPattern: "ISOLATION",
        equipment: "BODYWEIGHT",
        difficulty: "BEGINNER",
      });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const id = created.body.data.id as string;

    const res = await request(app)
      .get(`/api/v1/exercises/${id}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/v1/exercises/:id", () => {
  it("updates own custom exercise", async () => {
    const token = await registerAndLogin();
    const app = buildApp();

    const created = await request(app)
      .post("/api/v1/exercises")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Exercise To Update",
        muscleGroups: ["LEGS"],
        movementPattern: "SQUAT",
        equipment: "BARBELL",
        difficulty: "INTERMEDIATE",
      });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const id = created.body.data.id as string;

    const res = await request(app)
      .patch(`/api/v1/exercises/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Updated Exercise" });
    expect(res.status).toBe(200);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(res.body.data.name).toBe("Updated Exercise");
  });

  it("returns 403 when updating a system exercise", async () => {
    const token = await registerAndLogin();
    const app = buildApp();
    const list = await request(app)
      .get("/api/v1/exercises?pageSize=1")
      .set("Authorization", `Bearer ${token}`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const id = (list.body.data as Array<{ id: string }>)[0]!.id;

    const res = await request(app)
      .patch(`/api/v1/exercises/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Hacked Name" });
    expect(res.status).toBe(403);
  });

  it("returns 404 when updating another user's exercise", async () => {
    const tokenA = await registerAndLogin("_pa");
    const tokenB = await registerAndLogin("_pb");
    const app = buildApp();

    const created = await request(app)
      .post("/api/v1/exercises")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        name: "A User Exercise",
        muscleGroups: ["BICEPS"],
        movementPattern: "ISOLATION",
        equipment: "DUMBBELL",
        difficulty: "BEGINNER",
      });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const id = created.body.data.id as string;

    const res = await request(app)
      .patch(`/api/v1/exercises/${id}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ name: "Stolen Name" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/exercises/:id", () => {
  it("deletes own custom exercise", async () => {
    const token = await registerAndLogin();
    const app = buildApp();

    const created = await request(app)
      .post("/api/v1/exercises")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Exercise To Delete",
        muscleGroups: ["CORE"],
        movementPattern: "ISOLATION",
        equipment: "BODYWEIGHT",
        difficulty: "BEGINNER",
      });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const id = created.body.data.id as string;

    const del = await request(app)
      .delete(`/api/v1/exercises/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);

    const get = await request(app)
      .get(`/api/v1/exercises/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(get.status).toBe(404);
  });

  it("returns 403 when deleting a system exercise", async () => {
    const token = await registerAndLogin();
    const app = buildApp();
    const list = await request(app)
      .get("/api/v1/exercises?pageSize=1")
      .set("Authorization", `Bearer ${token}`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const id = (list.body.data as Array<{ id: string }>)[0]!.id;

    const res = await request(app)
      .delete(`/api/v1/exercises/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("returns 404 when deleting another user's exercise", async () => {
    const tokenA = await registerAndLogin("_da");
    const tokenB = await registerAndLogin("_db");
    const app = buildApp();

    const created = await request(app)
      .post("/api/v1/exercises")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        name: "A Deletable Exercise",
        muscleGroups: ["SHOULDERS"],
        movementPattern: "PUSH",
        equipment: "DUMBBELL",
        difficulty: "BEGINNER",
      });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const id = created.body.data.id as string;

    const res = await request(app)
      .delete(`/api/v1/exercises/${id}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });
});
