/**
 * Idempotent migration: stamp cohort='cohort-1' on every Student, Brand, and
 * ProgramMedia document that lacks it. Also transitions the program_media
 * collection from a global-unique `key` index to a compound (cohort, key) index.
 *
 * Run:  npx tsx scripts/migrate-cohorts.ts
 */

import mongoose from 'mongoose'
import * as dns from 'dns'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (process.env.MONGODB_DNS) {
  dns.setServers(process.env.MONGODB_DNS.split(',').map((s) => s.trim()))
}

const COHORT = 'cohort-1'

import { hardenOrExit } from './_guard'

async function main() {
  hardenOrExit('migrate-cohorts')
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set in .env.local')

  console.log('Connecting to MongoDB…')
  await mongoose.connect(uri)
  const db = mongoose.connection.db!

  // ── Students ──────────────────────────────────────────────────────────────
  const studentsCol = db.collection('students')
  const studentsResult = await studentsCol.updateMany(
    { cohort: { $exists: false } },
    { $set: { cohort: COHORT } }
  )
  console.log(`Students: ${studentsResult.modifiedCount} updated (${studentsResult.matchedCount} matched)`)

  // Verify: no doc without cohort
  const studentsMissing = await studentsCol.countDocuments({ cohort: { $exists: false } })
  console.log(`Students missing cohort after migration: ${studentsMissing}`)

  // ── Brands ────────────────────────────────────────────────────────────────
  const brandsCol = db.collection('brands')
  const brandsResult = await brandsCol.updateMany(
    { cohort: { $exists: false } },
    { $set: { cohort: COHORT } }
  )
  console.log(`Brands: ${brandsResult.modifiedCount} updated (${brandsResult.matchedCount} matched)`)

  const brandsMissing = await brandsCol.countDocuments({ cohort: { $exists: false } })
  console.log(`Brands missing cohort after migration: ${brandsMissing}`)

  // ── ProgramMedia ──────────────────────────────────────────────────────────
  const pmCol = db.collection('program_media')
  const pmResult = await pmCol.updateMany(
    { cohort: { $exists: false } },
    { $set: { cohort: COHORT } }
  )
  console.log(`ProgramMedia: ${pmResult.modifiedCount} updated (${pmResult.matchedCount} matched)`)

  const pmMissing = await pmCol.countDocuments({ cohort: { $exists: false } })
  console.log(`ProgramMedia missing cohort after migration: ${pmMissing}`)

  // ── Index transition on program_media ─────────────────────────────────────
  // Drop the old global-unique `key` index (if it exists), then ensure the
  // new compound (cohort, key) unique index exists.
  try {
    const existingIndexes = await pmCol.listIndexes().toArray()
    const oldKeyIndex = existingIndexes.find(
      (idx) => idx.key && Object.keys(idx.key).length === 1 && idx.key.key === 1 && idx.unique
    )
    if (oldKeyIndex) {
      await pmCol.dropIndex(oldKeyIndex.name)
      console.log(`Dropped old program_media index: ${oldKeyIndex.name}`)
    } else {
      console.log('No old program_media unique-key index found (already migrated or never existed)')
    }
  } catch (e) {
    console.warn('Could not inspect/drop old index (may already be gone):', (e as Error).message)
  }

  // Create compound unique index if absent
  await pmCol.createIndex({ cohort: 1, key: 1 }, { unique: true, background: true })
  console.log('Ensured compound unique index on program_media { cohort, key }')

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalStudents = await studentsCol.countDocuments()
  const totalBrands = await brandsCol.countDocuments()
  const totalPM = await pmCol.countDocuments()

  console.log('\n=== Migration Complete ===')
  console.log(`Total students: ${totalStudents}`)
  console.log(`Total brands:   ${totalBrands}`)
  console.log(`Total program_media docs: ${totalPM}`)

  if (studentsMissing + brandsMissing + pmMissing > 0) {
    console.error('ERROR: Some documents still have no cohort. Check above logs.')
    process.exit(1)
  }

  console.log('✓ All docs have cohort field. Isolation ready.')
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
