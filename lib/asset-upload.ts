// Helper around the FFP asset upload API.
// POSTs a file as multipart/form-data and returns the hosted URL.
//
//   curl --location 'https://msl-portal-backend.mesaschool.co.in/api/ffp-asset-upload' \
//        --form 'file=@"/path/to/image.jpg"'

const ASSET_UPLOAD_URL =
  process.env.FFP_ASSET_UPLOAD_URL ||
  'https://msl-portal-backend.mesaschool.co.in/api/ffp-asset-upload'

/** Probe a parsed response body for any field that looks like a hosted URL. */
function extractUrl(body: Record<string, unknown>): string | null {
  // Log once so we can see the real shape in Vercel logs.
  console.log('[asset-upload] raw response body:', JSON.stringify(body))

  // Common field names, in order of likelihood.
  for (const key of ['url', 'link', 'file_url', 'fileUrl', 'imageUrl', 'image_url', 'public_url', 'path']) {
    if (typeof body[key] === 'string' && (body[key] as string).startsWith('http')) {
      console.log(`[asset-upload] extracted URL from field "${key}":`, body[key])
      return body[key] as string
    }
  }
  // One level of nesting (e.g. { data: { url: "..." } })
  if (body.data && typeof body.data === 'object' && body.data !== null) {
    const d = body.data as Record<string, unknown>
    for (const key of ['url', 'link', 'file_url', 'fileUrl']) {
      if (typeof d[key] === 'string' && (d[key] as string).startsWith('http')) {
        console.log(`[asset-upload] extracted URL from data.${key}:`, d[key])
        return d[key] as string
      }
    }
  }
  return null
}

/**
 * Upload raw bytes to the FFP asset API and return the hosted URL string.
 * Throws if the upload fails or no URL can be found in the response.
 */
export async function uploadAsset(
  file: Blob | Buffer | Uint8Array,
  filename = 'upload.bin',
  contentType?: string
): Promise<string> {
  const blob =
    file instanceof Blob
      ? file
      : new Blob([file as BlobPart], contentType ? { type: contentType } : undefined)

  const form = new FormData()
  form.append('file', blob, filename)

  const res = await fetch(ASSET_UPLOAD_URL, { method: 'POST', body: form })

  const rawText = await res.text().catch(() => '')
  console.log(`[asset-upload] HTTP ${res.status} — raw body:`, rawText.slice(0, 500))

  if (!res.ok) {
    throw new Error(`FFP asset upload failed (${res.status}): ${rawText}`)
  }

  let body: Record<string, unknown> = {}
  try {
    body = JSON.parse(rawText)
  } catch {
    throw new Error(`FFP asset upload returned non-JSON: ${rawText.slice(0, 200)}`)
  }

  const url = extractUrl(body)
  if (!url) {
    throw new Error(
      `FFP asset upload succeeded but no URL found in response. Full body: ${JSON.stringify(body)}`
    )
  }

  return url
}

/**
 * Download a remote image and re-host it on GCS via the FFP asset API.
 * Returns the new hosted URL. On failure returns the original URL so no reference is lost.
 */
export async function rehostRemoteImage(url: string): Promise<string> {
  if (!url) return url
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${url} (${res.status})`)

  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  if (!contentType.startsWith('image/')) return url

  const buf = Buffer.from(await res.arrayBuffer())
  const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'
  const base = url.split('?')[0].split('/').pop() || `asset.${ext}`
  const filename = base.includes('.') ? base : `${base}.${ext}`

  return uploadAsset(buf, filename, contentType)
}
