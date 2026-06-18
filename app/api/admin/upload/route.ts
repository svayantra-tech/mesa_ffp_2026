import { NextResponse } from 'next/server'
import { uploadAsset } from '@/lib/asset-upload'

export const runtime = 'nodejs'

// Accepts multipart form with a `file` field, forwards server-side to the FFP
// asset API, and returns { url } — the hosted URL to store in the DB.
export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    const url = await uploadAsset(buf, file.name || 'upload', file.type || undefined)
    console.log('[upload route] returning url:', url)
    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('[upload route] error:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
