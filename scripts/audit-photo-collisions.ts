/**
 * READ-ONLY audit: detect image reuse across photo fields, for both cohorts.
 * Writes nothing. Reports:
 *   1. Students where >=2 of {profile,convocation,flea,demo}_photo are identical.
 *   2. URLs used by BOTH a Student photo field and a Brand feature/award photo.
 *   3. Brand feature_photo / award_photo shared across brands.
 *
 * Comparison is by the underlying Drive file id when present (thumbnail/GCS URLs
 * for the same source differ in host but share the id), else by the raw URL.
 *
 * Run:  npx tsx scripts/audit-photo-collisions.ts
 */
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

/** Reduce a URL to a comparison key: the Drive file id if we can find one, else the URL. */
function key(url: string): string {
  if (!url) return ''
  const m =
    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return m ? `drive:${m[1]}` : url.trim()
}

const STUDENT_FIELDS = ['profile_photo', 'convocation_photo', 'flea_market_photo', 'demo_day_photo'] as const

async function main() {
  const { connectDB } = await import('../lib/mongodb')
  const { Student } = await import('../lib/models/Student')
  const { Brand } = await import('../lib/models/Brand')
  await connectDB()

  for (const cohort of ['cohort-1', 'cohort-2']) {
    console.log(`\n════════════════════════════════════════════════════════`)
    console.log(`COHORT: ${cohort}`)
    console.log(`════════════════════════════════════════════════════════`)

    const students = await Student.find({ cohort }, 'name slug ' + STUDENT_FIELDS.join(' ')).lean() as any[]
    const brands = await Brand.find({ cohort }, 'name slug feature_photo award_photo').lean() as any[]

    // 1. Intra-student duplicates
    console.log('\n── 1. Students with the SAME image in 2+ of their photo fields ──')
    let intra = 0
    for (const s of students) {
      const groups = new Map<string, string[]>()
      for (const f of STUDENT_FIELDS) {
        const k = key(s[f] || '')
        if (!k) continue
        ;(groups.get(k) ?? groups.set(k, []).get(k)!).push(f)
      }
      for (const [k, fields] of groups) {
        if (fields.length >= 2) { console.log(`   ${s.name} (${s.slug}): ${fields.join(' = ')}  [${k}]`); intra++ }
      }
    }
    if (!intra) console.log('   (none)')

    // Build key → owners index across students + brands
    const owners = new Map<string, string[]>()
    const add = (k: string, label: string) => { if (k) (owners.get(k) ?? owners.set(k, []).get(k)!).push(label) }
    for (const s of students) for (const f of STUDENT_FIELDS) add(key(s[f] || ''), `Student:${s.slug}.${f}`)
    for (const b of brands) { add(key(b.feature_photo || ''), `Brand:${b.slug}.feature_photo`); add(key(b.award_photo || ''), `Brand:${b.slug}.award_photo`) }

    // 2. URL used by both a Student field and a Brand field
    console.log('\n── 2. Image shared between a Student field and a Brand field ──')
    let cross = 0
    for (const [k, labels] of owners) {
      const hasStudent = labels.some((l) => l.startsWith('Student:'))
      const hasBrand = labels.some((l) => l.startsWith('Brand:'))
      if (hasStudent && hasBrand) { console.log(`   [${k}]\n      ${labels.join('\n      ')}`); cross++ }
    }
    if (!cross) console.log('   (none)')

    // 3. Brand feature/award photo shared across DIFFERENT brands
    console.log('\n── 3. Brand feature_photo/award_photo shared across brands ──')
    let bshare = 0
    for (const [k, labels] of owners) {
      const brandLabels = labels.filter((l) => l.startsWith('Brand:'))
      const distinctBrands = new Set(brandLabels.map((l) => l.split(':')[1].split('.')[0]))
      if (distinctBrands.size >= 2) { console.log(`   [${k}]\n      ${brandLabels.join('\n      ')}`); bshare++ }
    }
    if (!bshare) console.log('   (none)')

    console.log(`\n   summary — intra-student: ${intra}, student↔brand: ${cross}, cross-brand: ${bshare}`)
  }
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
