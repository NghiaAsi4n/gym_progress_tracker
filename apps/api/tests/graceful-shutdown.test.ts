import { describe, expect, it, vi } from "vitest";

import { createShutdownHandler } from "../src/shared/graceful-shutdown.js";

describe("graceful shutdown", () => {
  it("closes HTTP before the database and ignores repeated signals", async () => {
    const operations: string[] = [];
    const server = {
      close(callback: (error?: Error) => void) {
        operations.push("http");
        callback();
      },
    };
    const onError = vi.fn();
    const shutdown = createShutdownHandler({
      disconnect: () => {
        operations.push("database");
        return Promise.resolve();
      },
      log: vi.fn(),
      onError,
      server,
    });

    await shutdown("SIGTERM");
    await shutdown("SIGINT");

    expect(operations).toEqual(["http", "database"]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports cleanup failures without throwing from the signal handler", async () => {
    const onError = vi.fn();
    const server = {
      close(callback: (error?: Error) => void) {
        callback(new Error("close failed"));
      },
    };
    const shutdown = createShutdownHandler({
      disconnect: vi.fn(),
      log: vi.fn(),
      onError,
      server,
    });

    await expect(shutdown("SIGTERM")).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledOnce();
  });
});
