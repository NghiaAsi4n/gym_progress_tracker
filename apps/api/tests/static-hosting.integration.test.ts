import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { TEST_AUTH_CONFIG } from "./test-config.js";

describe("production web hosting", () => {
  let webDistPath: string;

  beforeEach(async () => {
    webDistPath = await mkdtemp(join(tmpdir(), "gym-tracking-web-"));
    await mkdir(join(webDistPath, "assets"));
    await Promise.all([
      writeFile(
        join(webDistPath, "index.html"),
        '<!doctype html><html><body><div id="root">Gym Tracker</div></body></html>',
      ),
      writeFile(join(webDistPath, "assets", "app.js"), "console.log('gym tracker');"),
    ]);
  });

  afterEach(async () => {
    await rm(webDistPath, { force: true, recursive: true });
  });

  function createProductionApp() {
    return createApp({
      auth: TEST_AUTH_CONFIG,
      databaseStatus: () => "connected",
      nodeEnv: "production",
      webDistPath,
      webOrigin: "http://localhost:4000",
    });
  }

  it("serves the SPA shell for root and client-side routes", async () => {
    const app = createProductionApp();
    const [rootResponse, deepLinkResponse] = await Promise.all([
      request(app).get("/"),
      request(app).get("/progress"),
    ]);

    for (const response of [rootResponse, deepLinkResponse]) {
      expect(response.status).toBe(200);
      expect(response.type).toBe("text/html");
      expect(response.text).toContain("Gym Tracker");
      expect(response.headers["cache-control"]).toBe("no-cache");
      expect(response.headers["content-security-policy"]).toContain("script-src 'self'");
      expect(response.headers["content-security-policy"]).toContain("connect-src 'self'");
      expect(response.headers["content-security-policy"]).not.toContain("'unsafe-eval'");
    }
  });

  it("caches fingerprinted assets without falling back to index.html", async () => {
    const response = await request(createProductionApp()).get("/assets/app.js");

    expect(response.status).toBe(200);
    expect(response.type).toBe("text/javascript");
    expect(response.text).toContain("gym tracker");
    expect(response.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
  });

  it("keeps unknown API routes as JSON 404 responses", async () => {
    const response = await request(createProductionApp()).get("/api/v1/unknown");

    expect(response.status).toBe(404);
    expect(response.type).toBe("application/json");
    expect(response.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Route not found",
      },
    });
  });
});
