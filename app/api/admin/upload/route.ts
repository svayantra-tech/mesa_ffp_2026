import { NextResponse } from 'next/server'
import { uploadAsset } from '@/lib/asset-upload'

export const runtime = 'nodejs'

/**
 * Detect image type from magic bytes rather than trusting the browser's
 * file.type (which is wrong for HEIC, Drive downloads, and some Android files).
 */
function sniffContentType(buf: Buffer): string | null {
  if (buf.length < 12) return null
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg'
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png'
  // GIF: 47 49 46 38 (GIF8)
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return 'image/gif'
  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp'
  return null
}

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())

    // Sniff real type from bytes; fall back to browser-reported type only if
    // it's already a known image MIME. Rejects HEIC, octet-stream, etc. with
    // a clear message instead of forwarding a type the API will reject silently.
    const sniffed = sniffContentType(buf)
    const browserType = file.type || ''
    const KNOWN_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
    const contentType = sniffed ?? (KNOWN_IMAGE_TYPES.has(browserType) ? browserType : null)

    if (!contentType) {
      const hint = browserType.includes('heic') || browserType.includes('heif')
        ? 'HEIC/HEIF files are not supported — please convert to JPEG or PNG first.'
        : `File type "${browserType || 'unknown'}" is not supported. Upload a JPEG, PNG, WebP, or GIF.`
      return NextResponse.json({ error: hint }, { status: 415 })
    }

    const ext = contentType.split('/')[1] ?? 'jpg'
    const baseName = file.name ? file.name.replace(/\.[^.]+$/, '') : 'upload'
    const filename = `${baseName}.${ext}`

    const url = await uploadAsset(buf, filename, contentType)
    console.log('[upload route] returning url:', url)
    return NextResponse.json({ url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('[upload route] error:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
