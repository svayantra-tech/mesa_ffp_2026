import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { ProgramMedia } from '@/lib/models/ProgramMedia'
import { listProgramMedia, revalidatePublic } from '@/lib/admin-data'

export const runtime = 'nodejs'

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
        .map((it) =>
          ProgramMedia.updateOne(
            { key: it.key },
            { $set: { value: it.value ?? '' } },
            { upsert: true }
          )
        )
    )
    revalidatePublic()
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
