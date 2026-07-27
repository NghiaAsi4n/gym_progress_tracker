import mongoose from "mongoose";

export type DatabaseStatus = "connected" | "disconnected";

export async function connectDatabase(uri: string): Promise<void> {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5_000,
  });
}

export function getDatabaseStatus(): DatabaseStatus {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected
    ? "connected"
    : "disconnected";
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
