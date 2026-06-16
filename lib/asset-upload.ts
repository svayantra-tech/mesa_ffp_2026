// Helper around the FFP asset upload API.
// POSTs a file as multipart/form-data and returns a public GCS url that can be
// stored directly in MongoDB.
//
//   curl --location 'https://msl-portal-backend.mesaschool.co.in/api/ffp-asset-upload' \
//        --form 'file=@"/path/to/image.jpg"'

const ASSET_UPLOAD_URL =
  process.env.FFP_ASSET_UPLOAD_URL ||
  'https://msl-portal-backend.mesaschool.co.in/api/ffp-asset-upload'

export type AssetUploadResult = {
  url: string
  filename: string
  original_name: string
  content_type: string
  size: number
}

/**
 * Upload raw bytes (Buffer / Blob / File) to the FFP asset API.
 * Returns the JSON response including the public `url`.
 */
export async function uploadAsset(
  file: Blob | Buffer | Uint8Array,
  filename = 'upload.bin',
  contentType?: string
): Promise<AssetUploadResult> {
  const blob =
    file instanceof Blob
      ? file
      : new Blob([file as BlobPart], contentType ? { type: contentType } : undefined)

  const form = new FormData()
  form.append('file', blob, filename)

  const res = await fetch(ASSET_UPLOAD_URL, { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`FFP asset upload failed (${res.status}): ${body}`)
  }
  return (await res.json()) as AssetUploadResult
}

/**
 * Download a remote image and re-host it on GCS via the FFP asset API.
 * Returns the new public url. On any failure the original url is returned so a
 * migration never loses a reference.
 */
export async function rehostRemoteImage(url: string): Promise<string> {
  if (!url) return url
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to download ${url} (${res.status})`)

  const contentType = res.headers.get('content-type') || 'application/octet-stream'
  if (!contentType.startsWith('image/')) {
    // Not an image (html redirect page, video, etc.) — leave the url untouched.
    return url
  }

  const buf = Buffer.from(await res.arrayBuffer())
  const ext = contentType.split('/')[1]?.split(';')[0] || 'jpg'
  const base = url.split('?')[0].split('/').pop() || `asset.${ext}`
  const filename = base.includes('.') ? base : `${base}.${ext}`

  const { url: newUrl } = await uploadAsset(buf, filename, contentType)
  return newUrl
}
