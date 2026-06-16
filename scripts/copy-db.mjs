/**
 * Copy the migrated collections from one Mongo database to another within the
 * same cluster (e.g. ffpportfolio -> database), preserving _id and refs.
 *
 * Usage: node scripts/copy-db.mjs <sourceDb> <destDb>
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import dns from 'node:dns'
import { MongoClient } from 'mongodb'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
try {
  for (const line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq > -1 && !(t.slice(0, eq).trim() in process.env)) process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
  }
} catch {}
if (process.env.MIGRATE_DNS) dns.setServers(process.env.MIGRATE_DNS.split(','))

const SOURCE = process.argv[2] || 'ffpportfolio'
const DEST = process.argv[3] || 'database'
const COLLECTIONS = ['brands', 'students', 'program_media']

const client = new MongoClient(process.env.MONGODB_URI)
await client.connect()
const src = client.db(SOURCE)
const dst = client.db(DEST)
console.log(`Copying ${COLLECTIONS.join(', ')} from "${SOURCE}" -> "${DEST}"`)

for (const name of COLLECTIONS) {
  const docs = await src.collection(name).find({}).toArray()
  await dst.collection(name).deleteMany({})
  if (docs.length) await dst.collection(name).insertMany(docs)
  console.log(`  ${name}: ${docs.length} docs`)
}

await Promise.all([
  dst.collection('brands').createIndex({ slug: 1 }, { unique: true }),
  dst.collection('students').createIndex({ slug: 1 }, { unique: true }),
  dst.collection('students').createIndex({ brand_id: 1 }),
  dst.collection('program_media').createIndex({ key: 1 }, { unique: true }),
])

await client.close()
console.log('Copy complete.')
