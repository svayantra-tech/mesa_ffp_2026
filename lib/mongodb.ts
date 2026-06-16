import mongoose from 'mongoose'
import dns from 'node:dns'

// Optional DNS override (e.g. MONGODB_DNS=8.8.8.8,1.1.1.1) for environments
// whose default resolver can't resolve Atlas SRV records.
if (process.env.MONGODB_DNS) {
  try {
    dns.setServers(process.env.MONGODB_DNS.split(',').map((s) => s.trim()))
  } catch {}
}

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not defined in the environment')
}

type MongooseCache = {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

// Reuse the connection across hot reloads / serverless invocations.
const globalForMongoose = global as unknown as { mongoose?: MongooseCache }
const cached: MongooseCache = globalForMongoose.mongoose || { conn: null, promise: null }
globalForMongoose.mongoose = cached

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((m) => m)
  }

  try {
    cached.conn = await cached.promise
  } catch (err) {
    cached.promise = null
    throw err
  }

  return cached.conn
}

export default connectDB
