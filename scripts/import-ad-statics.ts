/**
 * One-off: download Drive-hosted static ad images, re-host via the FFP asset
 * pipeline, and store the hosted URLs on each brand's ad_statics field.
 *
 * Run:  npx tsx scripts/import-ad-statics.ts
 */

import 'dotenv/config'
import { connectDB } from '../lib/mongodb'
import { Brand } from '../lib/models/Brand'
import { uploadAsset } from '../lib/asset-upload'

// ── Hardcoded brand → Drive file-ID map ───────────────────────────────────────

const AD_STATICS: Record<string, string[]> = {
  'Better Crunch':    ['1fxcfzs-HDktBxnUkDGc-ROVahR05ek2t', '1-RcMRCknf1z6BJXeN-GLijXl76WLKIyU'],
  'House of Makhana': ['1sAgiaxjJq0UMUGCTu4DFaGJlAmskyTR7'],
  'Eclipse':          ['1p1rHH_8u0pk7wf_-mDurn_B0aI6ula8O'],
  'Blu Root':         ['1F8VvU-nv8RgnsrtxuYbYtk7BvFuVWua4'],
  'Krunch':           ['1OD089vXUzT64wgV-dXFRCqKg-7E8JYqv'],
  'Zulu':             ['1rudYaW5etCQXIkJpzQqhqublBVsiTnQg'],
}

// ── helpers ───────────────────────────────────────────────────────────────────

function normName(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ')
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/** Download a Drive file via the thumbnail endpoint; returns { buf, contentType } or throws. */
async function fetchFromDrive(
  fileId: string
): Promise<{ buf: Buffer; contentType: string }> {
  const url = `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const ct = res.headers.get('content-type') ?? ''
  if (!ct.startsWith('image/')) {
    throw new Error(
      `Not an image — content-type="${ct}" (file may not be shared "anyone with the link")`
    )
  }

  const buf = Buffer.from(await res.arrayBuffer())
  return { buf, contentType: ct }
}

/** Verify a hosted URL actually serves an image. */
async function verifyHostedUrl(url: string): Promise<void> {
  const res = await fetch(url, { method: 'HEAD', redirect: 'follow' })
  if (!res.ok) throw new Error(`Hosted URL returned HTTP ${res.status}`)
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.startsWith('image/')) throw new Error(`Hosted URL content-type="${ct}"`)
}

// ── result types ──────────────────────────────────────────────────────────────

type SlotResult =
  | { status: 'ok'; driveId: string; hostedUrl: string }
  | { status: 'failed'; driveId: string; reason: string }

type BrandResult =
  | { brand: string; status: 'skipped_already_has'; count: number }
  | { brand: string; status: 'unmatched' }
  | { brand: string; status: 'done'; slots: SlotResult[] }

// ── main ──────────────────────────────────────────────────────────────────────

import { hardenOrExit } from './_guard'

async function main() {
  hardenOrExit('import-ad-statics')
  console.log('Connecting to MongoDB…')
  await connectDB()

  const allBrands = await Brand.find({}, 'name slug ad_statics').lean()
  console.log(`  Loaded ${allBrands.length} brands from DB.\n`)

  const nameMap = new Map(allBrands.map((b) => [normName(b.name as string), b]))
  const slugMap = new Map(allBrands.map((b) => [b.slug as string, b]))

  const results: BrandResult[] = []

  for (const [brandName, driveIds] of Object.entries(AD_STATICS)) {
    console.log(`\n── ${brandName} ──────────────────────────────────────`)

    // Match brand
    const matched =
      nameMap.get(normName(brandName)) ??
      slugMap.get(slugify(brandName)) ??
      null

    if (!matched) {
      console.log(`  UNMATCHED — no brand found for "${brandName}"`)
      results.push({ brand: brandName, status: 'unmatched' })
      continue
    }

    // Idempotency guard
    const existing = (matched.ad_statics as string[] | undefined) ?? []
    if (existing.length > 0) {
      console.log(`  SKIP — already has ${existing.length} ad_statics`)
      results.push({ brand: brandName, status: 'skipped_already_has', count: existing.length })
      continue
    }

    const slots: SlotResult[] = []

    for (let i = 0; i < driveIds.length; i++) {
      const driveId = driveIds[i]
      const filename = `${slugify(brandName)}-adstatic-${i + 1}.jpg`
      console.log(`  [${i + 1}/${driveIds.length}] Drive ID: ${driveId}`)

      // Step 1: fetch from Drive
      let buf: Buffer
      let contentType: string
      try {
        ;({ buf, contentType } = await fetchFromDrive(driveId))
        console.log(`    ✓ Downloaded ${buf.length} bytes (${contentType})`)
      } catch (err) {
        const reason = `Drive fetch failed: ${(err as Error).message}`
        console.log(`    ✗ FAILED — ${reason}`)
        slots.push({ status: 'failed', driveId, reason })
        continue
      }

      // Step 2: re-host via asset pipeline
      let hostedUrl: string
      try {
        hostedUrl = await uploadAsset(buf, filename, contentType)
        console.log(`    ✓ Hosted at: ${hostedUrl}`)
      } catch (err) {
        const reason = `Upload failed: ${(err as Error).message}`
        console.log(`    ✗ FAILED — ${reason}`)
        slots.push({ status: 'failed', driveId, reason })
        continue
      }

      // Step 3: verify hosted URL
      try {
        await verifyHostedUrl(hostedUrl)
        console.log(`    ✓ Verified hosted URL`)
      } catch (err) {
        const reason = `Hosted URL verification failed: ${(err as Error).message}`
        console.log(`    ✗ FAILED — ${reason}`)
        slots.push({ status: 'failed', driveId, reason })
        continue
      }

      slots.push({ status: 'ok', driveId, hostedUrl })
    }

    // Write to DB — only the successfully hosted URLs, in order
    const hostedUrls = slots
      .filter((s): s is Extract<SlotResult, { status: 'ok' }> => s.status === 'ok')
      .map((s) => s.hostedUrl)

    if (hostedUrls.length > 0) {
      await Brand.updateOne(
        { _id: (matched as Record<string, unknown>)._id },
        { $set: { ad_statics: hostedUrls } }
      )
      console.log(`  → Saved ${hostedUrls.length} URL(s) to ad_statics`)
    } else {
      console.log(`  → No URLs to save (all slots failed)`)
    }

    results.push({ brand: brandName, status: 'done', slots })
  }

  // ── Final report ────────────────────────────────────────────────────────────

  console.log('\n\n════════════════════════════════════════════════════════')
  console.log('IMPORT REPORT')
  console.log('════════════════════════════════════════════════════════')

  for (const r of results) {
    if (r.status === 'unmatched') {
      console.log(`\n❓ UNMATCHED: "${r.brand}"`)
      continue
    }
    if (r.status === 'skipped_already_has') {
      console.log(`\nℹ️  SKIPPED (already has ${r.count}): "${r.brand}"`)
      continue
    }

    const ok = r.slots.filter((s) => s.status === 'ok').length
    const failed = r.slots.filter((s) => s.status === 'failed').length
    console.log(`\n${ok > 0 ? '✅' : '❌'} ${r.brand} — ${ok} ok, ${failed} failed`)
    for (const s of r.slots) {
      if (s.status === 'ok') {
        console.log(`   ✓ ${s.driveId} → ${s.hostedUrl}`)
      } else {
        console.log(`   ✗ ${s.driveId} — FAILED: ${s.reason}`)
      }
    }
  }

  console.log('\n════════════════════════════════════════════════════════')
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
