/**
 * Data-layer isolation smoke test.
 * Connects to Atlas and verifies cohort counts + completeness.
 * Run: npx tsx scripts/smoke-isolation.ts
 */
import mongoose from 'mongoose'
import * as dns from 'dns'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (process.env.MONGODB_DNS) {
  dns.setServers(process.env.MONGODB_DNS.split(',').map((s) => s.trim()))
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')

  console.log('Connecting to MongoDB…')
  await mongoose.connect(uri)
  const db = mongoose.connection.db!

  const students = db.collection('students')
  const brands = db.collection('brands')
  const pm = db.collection('program_media')

  // ── Per-cohort counts ─────────────────────────────────────────────────────
  const [s1, s2, sMissing] = await Promise.all([
    students.countDocuments({ cohort: 'cohort-1' }),
    students.countDocuments({ cohort: 'cohort-2' }),
    students.countDocuments({ cohort: { $exists: false } }),
  ])
  const [b1, b2, bMissing] = await Promise.all([
    brands.countDocuments({ cohort: 'cohort-1' }),
    brands.countDocuments({ cohort: 'cohort-2' }),
    brands.countDocuments({ cohort: { $exists: false } }),
  ])
  const [p1, p2, pMissing] = await Promise.all([
    pm.countDocuments({ cohort: 'cohort-1' }),
    pm.countDocuments({ cohort: 'cohort-2' }),
    pm.countDocuments({ cohort: { $exists: false } }),
  ])

  console.log('\n=== Cohort Isolation Report ===')
  console.log('')
  console.log(`Collection         cohort-1  cohort-2  no-cohort`)
  console.log(`─────────────────  ────────  ────────  ─────────`)
  console.log(`students           ${String(s1).padEnd(8)}  ${String(s2).padEnd(8)}  ${sMissing}`)
  console.log(`brands             ${String(b1).padEnd(8)}  ${String(b2).padEnd(8)}  ${bMissing}`)
  console.log(`program_media      ${String(p1).padEnd(8)}  ${String(p2).padEnd(8)}  ${pMissing}`)

  // ── Index verification ────────────────────────────────────────────────────
  const indexes = await pm.listIndexes().toArray()
  const hasCompound = indexes.some(
    (i) => i.key?.cohort === 1 && i.key?.key === 1 && i.unique
  )
  const hasOldIndex = indexes.some(
    (i) => Object.keys(i.key ?? {}).length === 1 && i.key?.key === 1 && i.unique
  )
  console.log('')
  console.log(`program_media compound unique index {cohort,key}: ${hasCompound ? '✓ present' : '✗ MISSING'}`)
  console.log(`program_media old single-key unique index:        ${hasOldIndex ? '✗ STILL PRESENT' : '✓ removed'}`)

  // ── Pass/fail ─────────────────────────────────────────────────────────────
  console.log('')
  const allIssues: string[] = []
  if (sMissing > 0) allIssues.push(`${sMissing} students missing cohort`)
  if (bMissing > 0) allIssues.push(`${bMissing} brands missing cohort`)
  if (pMissing > 0) allIssues.push(`${pMissing} program_media docs missing cohort`)
  if (!hasCompound) allIssues.push('compound index missing on program_media')
  if (hasOldIndex) allIssues.push('old key-only unique index still on program_media')
  if (s1 < 100) allIssues.push(`cohort-1 only has ${s1} students (expected ~113)`)
  if (s2 > 0) allIssues.push(`cohort-2 already has ${s2} students (should be 0)`)
  if (b2 > 0) allIssues.push(`cohort-2 already has ${b2} brands (should be 0)`)
  if (p2 > 0) allIssues.push(`cohort-2 already has ${p2} program_media (should be 0)`)

  if (allIssues.length === 0) {
    console.log('✓ PASS — cohort-1 full, cohort-2 empty, all docs scoped, indexes correct.')
  } else {
    console.error('✗ FAIL:')
    allIssues.forEach((i) => console.error(`  · ${i}`))
    process.exit(1)
  }

  await mongoose.disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
