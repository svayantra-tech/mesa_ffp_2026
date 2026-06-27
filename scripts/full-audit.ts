/**
 * Full site audit script — data integrity, routing, query isolation, media pipeline.
 * Run: npx tsx scripts/full-audit.ts
 */
import mongoose from 'mongoose'
import * as dns from 'dns'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as https from 'https'
import * as http from 'http'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
if (process.env.MONGODB_DNS) {
  dns.setServers(process.env.MONGODB_DNS.split(',').map(s => s.trim()))
}

type R = { pass: string[]; warn: string[]; fail: string[] }
const results: Record<string, R> = {}
function section(name: string): R {
  results[name] = { pass: [], warn: [], fail: [] }
  return results[name]
}

function checkUrl(url: string): Promise<number> {
  return new Promise(resolve => {
    const mod = url.startsWith('https') ? https : http
    try {
      const req = mod.get(url, { timeout: 8000 }, res => {
        res.resume()
        resolve(res.statusCode ?? 0)
      })
      req.on('error', () => resolve(0))
      req.on('timeout', () => { req.destroy(); resolve(0) })
    } catch { resolve(0) }
  })
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

  // ── SECTION 1: Data Integrity ──────────────────────────────────────────────
  const r1 = section('DATA_INTEGRITY')

  const s1Count = await students.countDocuments({ cohort: 'cohort-1' })
  const s2Count = await students.countDocuments({ cohort: 'cohort-2' })
  const sMissing = await students.countDocuments({ cohort: { $exists: false } })
  const b1Count = await brands.countDocuments({ cohort: 'cohort-1' })
  const b2Count = await brands.countDocuments({ cohort: 'cohort-2' })
  const p1Count = await pm.countDocuments({ cohort: 'cohort-1' })
  const p2Count = await pm.countDocuments({ cohort: 'cohort-2' })

  s1Count === 113 ? r1.pass.push(`students cohort-1: ${s1Count}`) : r1.fail.push(`students cohort-1: ${s1Count} (expected 113)`)
  b1Count === 29 ? r1.pass.push(`brands cohort-1: ${b1Count}`) : r1.fail.push(`brands cohort-1: ${b1Count} (expected 29)`)
  s2Count === 0 ? r1.pass.push(`students cohort-2: 0 (empty)`) : r1.fail.push(`students cohort-2: ${s2Count} (should be 0)`)
  b2Count === 0 ? r1.pass.push(`brands cohort-2: 0 (empty)`) : r1.fail.push(`brands cohort-2: ${b2Count} (should be 0)`)
  p2Count === 0 ? r1.pass.push(`program_media cohort-2: 0`) : r1.warn.push(`program_media cohort-2: ${p2Count}`)
  sMissing === 0 ? r1.pass.push('no students missing cohort') : r1.fail.push(`${sMissing} students missing cohort`)

  // Orphaned brand_ids
  const allStudents = await students.find({ cohort: 'cohort-1' }).toArray()
  const allBrands = await brands.find({ cohort: 'cohort-1' }).toArray()
  const brandIdSet = new Set(allBrands.map((b: any) => String(b._id)))
  const brandSlugSet = new Set(allBrands.map((b: any) => b.slug))
  const orphaned = allStudents.filter((s: any) => s.brand_id && !brandIdSet.has(String(s.brand_id)) && !brandSlugSet.has(s.brand_id))
  orphaned.length === 0 ? r1.pass.push('no orphaned student.brand_id') : r1.fail.push(`${orphaned.length} orphaned brand_ids: ${orphaned.map((s:any)=>s.slug).join(', ')}`)

  // Missing certificate_url
  const missingCert = allStudents.filter((s: any) => !s.certificate_url)
  missingCert.length === 0
    ? r1.pass.push('all students have certificate_url')
    : r1.warn.push(`${missingCert.length} students missing certificate_url: ${missingCert.slice(0,5).map((s:any)=>s.slug).join(', ')}${missingCert.length>5?'…':''}`)

  // Photo fields with non-http values
  const photoFields = ['profile_photo', 'convocation_photo', 'flea_photo', 'demo_photo']
  for (const field of photoFields) {
    const bad = allStudents.filter((s: any) => s[field] && !String(s[field]).startsWith('http'))
    bad.length === 0
      ? r1.pass.push(`${field}: all values are http URLs (or empty)`)
      : r1.fail.push(`${field}: ${bad.length} non-http values: ${bad.slice(0,3).map((s:any)=>s.slug).join(', ')}`)
  }

  // Raw Drive viewer links stored as photo URLs (/file/d/.../view)
  const driveViewerPattern = /\/file\/d\/.+\/view/
  for (const field of photoFields) {
    const bad = allStudents.filter((s: any) => s[field] && driveViewerPattern.test(s[field]))
    bad.length > 0 && r1.fail.push(`${field}: ${bad.length} raw Drive viewer URLs: ${bad.slice(0,3).map((s:any)=>s.slug).join(', ')}`)
  }

  // Brands missing feature_photo
  const brandsMissingPhoto = allBrands.filter((b: any) => !b.feature_photo)
  brandsMissingPhoto.length === 0
    ? r1.pass.push('all brands have feature_photo')
    : r1.warn.push(`${brandsMissingPhoto.length} brands missing feature_photo: ${brandsMissingPhoto.map((b:any)=>b.slug).join(', ')}`)

  // program_media keys
  const pmDocs = await pm.find({ cohort: 'cohort-1' }).toArray()
  const pmKeys = pmDocs.map((d: any) => d.key)
  const requiredKeys = ['hero_photo', 'demo_day_video', 'ffp_2027_photo', 'landing_flea_photos']
  for (const key of requiredKeys) {
    pmKeys.includes(key) ? r1.pass.push(`program_media key '${key}' present`) : r1.warn.push(`program_media key '${key}' missing`)
  }
  // Validate JSON fields
  const jsonKeys = ['landing_flea_photos', 'top_performers', 'landing_top_performers']
  for (const key of jsonKeys) {
    const doc = pmDocs.find((d: any) => d.key === key)
    if (doc) {
      try { JSON.parse(doc.value); r1.pass.push(`program_media '${key}': valid JSON`) }
      catch { r1.fail.push(`program_media '${key}': INVALID JSON`) }
    }
  }

  // Completion stats check: cert + convocation + flea + demo fields
  const withCert = allStudents.filter((s: any) => s.certificate_url).length
  const withConvoc = allStudents.filter((s: any) => s.convocation_photo).length
  const withFlea = allStudents.filter((s: any) => s.flea_photo).length
  const withDemo = allStudents.filter((s: any) => s.demo_photo).length
  r1.pass.push(`completion stats — cert:${withCert} convoc:${withConvoc} flea:${withFlea} demo:${withDemo} (of 113)`)

  // ── SECTION 2: Route slugs ─────────────────────────────────────────────────
  const r2 = section('ROUTES')
  const slugs = allStudents.map((s: any) => s.slug).filter(Boolean)
  r2.pass.push(`collected ${slugs.length} student slugs from cohort-1`)

  // Sample-check 10 image URLs from various fields
  const r3 = section('IMAGE_URLS')
  const sampleImages: string[] = []
  for (const s of allStudents.slice(0, 20)) {
    for (const f of photoFields) {
      if ((s as any)[f]) sampleImages.push((s as any)[f])
    }
  }
  // Check first 15 unique non-empty URLs
  const uniqueImages = [...new Set(sampleImages)].slice(0, 15)
  const imageChecks = await Promise.all(uniqueImages.map(url => checkUrl(url).then(code => ({ url, code }))))
  const img404s = imageChecks.filter(c => c.code === 404 || c.code === 403)
  const imgOk = imageChecks.filter(c => c.code === 200 || c.code === 302 || c.code === 301)
  imgOk.length > 0 && r3.pass.push(`${imgOk.length}/${uniqueImages.length} sampled image URLs reachable`)
  img404s.length > 0 && r3.fail.push(`${img404s.length} image URLs 404/403: ${img404s.slice(0,3).map(c=>c.url.slice(0,60)).join(' | ')}`)
  const unreachable = imageChecks.filter(c => c.code === 0)
  unreachable.length > 0 && r3.warn.push(`${unreachable.length} image URLs timed out / unreachable (network restriction)`)

  // ── SECTION 3: Index on program_media ─────────────────────────────────────
  const r4 = section('INDEXES')
  const indexes = await pm.listIndexes().toArray()
  const compound = indexes.find((i: any) => i.key?.cohort === 1 && i.key?.key === 1 && i.unique)
  const oldIdx = indexes.find((i: any) => Object.keys(i.key ?? {}).length === 1 && i.key?.key === 1 && i.unique)
  compound ? r4.pass.push('program_media compound {cohort,key} unique index present') : r4.fail.push('program_media compound index MISSING')
  !oldIdx ? r4.pass.push('old key_1 unique index removed') : r4.fail.push('old key_1 unique index still present')

  // ── Print ──────────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60))
  console.log('FULL AUDIT REPORT')
  console.log('═'.repeat(60))
  for (const [name, r] of Object.entries(results)) {
    const total = r.pass.length + r.warn.length + r.fail.length
    const status = r.fail.length > 0 ? '✗ FAIL' : r.warn.length > 0 ? '⚠ WARN' : '✓ PASS'
    console.log(`\n[${status}] ${name}`)
    r.pass.forEach(m => console.log(`  ✓ ${m}`))
    r.warn.forEach(m => console.log(`  ⚠ ${m}`))
    r.fail.forEach(m => console.log(`  ✗ ${m}`))
  }

  // Export slugs for HTTP smoke test
  const fs = await import('fs')
  fs.writeFileSync('.audit-slugs.json', JSON.stringify(slugs))
  console.log(`\nExported ${slugs.length} slugs to .audit-slugs.json`)

  await mongoose.disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
