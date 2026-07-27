import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase, getDatabaseStatus } from "./config/database.js";
import { loadRootEnvFile, parseEnv } from "./config/env.js";
import { createShutdownHandler } from "./shared/graceful-shutdown.js";

export async function startServer() {
  loadRootEnvFile();
  const env = parseEnv();
  await connectDatabase(env.MONGODB_URI);

  const app = createApp({
    databaseStatus: getDatabaseStatus,
    webOrigin: env.WEB_ORIGIN,
  });
  const server = app.listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });

  const shutdown = createShutdownHandler({
    disconnect: disconnectDatabase,
    log: (message) => console.log(message),
    onError: () => {
      process.exitCode = 1;
    },
    server,
  });

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  return server;
}

if (process.env.NODE_ENV !== "test") {
  void startServer().catch(() => {
    console.error("API failed to start");
    process.exitCode = 1;
  });
}
