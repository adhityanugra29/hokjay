import mongoose from "mongoose";

/**
 * Cached Mongoose connection, shared across hot-reloads in dev and across
 * invocations on the same server instance. Every API route / Server
 * Component that talks to the database should `await dbConnect()` first.
 */
const cached = globalThis._mongoose ?? { conn: null, promise: null };
globalThis._mongoose = cached;

export async function dbConnect() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.local.example to .env.local and fill in your MongoDB Atlas connection string."
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, { bufferCommands: false });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
