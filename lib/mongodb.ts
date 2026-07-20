import mongoose from 'mongoose'
import dns from 'node:dns'

// Optional DNS override (e.g. MONGODB_DNS=8.8.8.8,1.1.1.1) for environments
// whose default resolver can't resolve Atlas SRV records. Applied right before
// connecting (not just at module load) because some runtimes — e.g. the Next.js
// dev server — reset the resolver after this module is first imported, which
// would drop a top-level setServers() and fall back to a system resolver that
// refuses SRV queries (querySrv ECONNREFUSED).
function applyDnsOverride() {
  if (!process.env.MONGODB_DNS) return
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

// Connect with a few retries. The Next.js dev server resets the DNS resolver
// shortly after startup, which can race with the first request and make the
// initial SRV lookup fail (querySrv ECONNREFUSED). Re-applying the DNS override
// and retrying a couple of times lets the first request recover silently instead
// of surfacing a 500.
async function connectWithRetry(attempts = 4): Promise<typeof mongoose> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    applyDnsOverride()
    try {
      return await mongoose.connect(MONGODB_URI, { bufferCommands: false })
    } catch (err) {
      lastErr = err
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 200))
    }
  }
  throw lastErr
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = connectWithRetry()
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
