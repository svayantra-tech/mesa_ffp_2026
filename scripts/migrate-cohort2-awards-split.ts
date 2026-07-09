/**
 * Migrate cohort-2 Brand.awards from a single comma-joined string element
 * (e.g. ["Spirit of Entrepreneurship,Best Logo,Best Team Bonding"]) into proper
 * array elements (["Spirit of Entrepreneurship", "Best Logo", "Best Team Bonding"]).
 *
 * Cohort-1 already stores real arrays; only cohort-2's importer joined them. Once
 * migrated, Awards.tsx needs no display-time comma-splitting (which would break on
 * any award title that legitimately contains a comma).
 *
 * Idempotent: a brand whose awards are already split is left unchanged.
 *
 * Run:  npx tsx scripts/migrate-cohort2-awards-split.ts
 */
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function main() {
  const { connectDB } = await import('../lib/mongodb')
  const { Brand } = await import('../lib/models/Brand')
  await connectDB()

  const brands = await Brand.find({ cohort: 'cohort-2' }, 'name awards').lean() as { _id: unknown; name: string; awards?: string[] }[]
  let changed = 0
  const report: string[] = []

  for (const b of brands) {
    const current = Array.isArray(b.awards) ? b.awards : []
    const split = current.flatMap((entry) => entry.split(',').map((s) => s.trim()).filter(Boolean))
    // Only write when the split actually differs (idempotent).
    const differs = split.length !== current.length || split.some((v, i) => v !== current[i])
    if (differs) {
      await Brand.updateOne({ _id: b._id }, { $set: { awards: split } })
      changed++
      report.push(`  ${b.name}: ${JSON.stringify(current)}  →  ${JSON.stringify(split)}`)
    }
  }

  console.log(`Migrated ${changed} cohort-2 brand(s):`)
  for (const r of report) console.log(r)
  const stillJoined = (await Brand.find({ cohort: 'cohort-2', awards: /,/ }, 'name').lean()).map((b) => (b as { name: string }).name)
  console.log(`\nBrands still containing a comma inside an awards element: ${stillJoined.length ? stillJoined.join(', ') : '(none)'}`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
