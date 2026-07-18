import mongoose from 'mongoose';

// Cached Mongoose connection. In Next.js (dev especially) modules are reloaded
// and API routes run many times, so we memoise the connection promise on the
// global object to avoid opening a new pool on every request / hot reload.

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongoose ?? { conn: null, promise: null };
global._mongoose = cached;

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Add it to .env');
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', true);
    cached.promise = mongoose
      .connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
      .then((m) => {
        console.log('✓ MongoDB connected');
        return m;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
