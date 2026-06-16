import { NextResponse } from 'next/server'
import { uploadAsset } from '@/lib/asset-upload'

export const runtime = 'nodejs'

// Accepts a multipart form with a `file` field, forwards it to the FFP asset
// API, and returns the public url to store in the DB.
export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const result = await uploadAsset(buf, file.name || 'upload', file.type || undefined)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
