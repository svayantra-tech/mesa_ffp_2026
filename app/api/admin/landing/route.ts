import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { ProgramMedia } from '@/lib/models/ProgramMedia'
import { listProgramMedia, revalidatePublic } from '@/lib/admin-data'
import { extractYouTubeId, normalizeImageUrl } from '@/lib/normalize'

export const runtime = 'nodejs'

// Keys whose values are JSON arrays — must not be run through normalizeImageUrl.
const JSON_ARRAY_KEYS = new Set([
  'landing_hero_image',
  'landing_demo_day',
  'landing_flea_photos',
])

function normalizeMedia(key: string, value: string): string {
  if (JSON_ARRAY_KEYS.has(key)) return value          // already-normalized JSON array
  if (/video_id$/.test(key)) return extractYouTubeId(value)
  if (/(photo|image|img|poster|thumb)/i.test(key)) return normalizeImageUrl(value)
  return value
}

export async function GET() {
  return NextResponse.json(await listProgramMedia())
}

// Bulk upsert: body = { items: [{ key, value }] }
export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}))
  const items: { key: string; value: string }[] = Array.isArray(body.items) ? body.items : []
  if (!items.length) return NextResponse.json({ error: 'No items' }, { status: 400 })

  await connectDB()
  try {
    await Promise.all(
      items
        .filter((it) => it && it.key)
        .map((it) => {
          // Coerce to strings so a malformed body can't smuggle a Mongo
          // operator object into the query filter.
          const key = String(it.key)
          const value = String(it.value ?? '')
          return ProgramMedia.updateOne(
            { key },
            { $set: { value: normalizeMedia(key, value) } },
            { upsert: true }
          )
        })
    )
    revalidatePublic()
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
