import mongoose, { Mongoose } from "mongoose";

const MONGODB_URL = process.env.MONGODB_URI;

interface MongooseConnection {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

let cached: MongooseConnection = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export const connectToDatabase = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!MONGODB_URL) {
    throw new Error("MONGODB URL doesn't exists.");
  }

  // if there is no cached promise connection
  cached.promise =
    cached.promise ||
    mongoose.connect(MONGODB_URL, { dbName: "imazon", bufferCommands: false });

  cached.conn = await cached.promise;
  return cached.conn;
};
