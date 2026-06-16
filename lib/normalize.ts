// Shared input normalizers — used by the admin UI (instant) and the API routes
// (authoritative on save) so a pasted link is stored as the value we actually
// want (YouTube id, direct image url, etc.).

/** Pull the 11-char video id out of any YouTube url; pass through a bare id. */
export function extractYouTubeId(input: string): string {
  if (!input) return ''
  const url = input.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return url
}

function driveFileId(url: string): string | null {
  const m =
    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
    url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}

/**
 * Normalize a pasted image link into something that renders directly in an
 * <img>. Google Drive share links ("/file/d/<id>/view") become a direct
 * thumbnail url; everything else (GCS, Instagram, normal image urls) is kept.
 */
export function normalizeImageUrl(input: string): string {
  if (!input) return ''
  const url = input.trim()
  if (!/^https?:\/\//i.test(url)) return url
  if (url.includes('drive.google.com')) {
    const id = driveFileId(url)
    if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1600`
  }
  return url
}
