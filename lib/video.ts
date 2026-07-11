import { extractYouTubeId } from '@/lib/normalize'

export type VideoKind = 'youtube' | 'drive'
export type ClassifiedVideo = { id: string; kind: VideoKind }

/**
 * Shared video-id classifier used by BOTH the public portfolio (MarketingAssets)
 * and the admin VideoListField, so the two never drift.
 * Stored ids are bare: 11 chars → YouTube, 28/33 chars → Google Drive file id.
 * Also tolerates a pasted YouTube or Drive URL. Anything else → null (caller renders
 * nothing).
 */
export function classifyVideo(entry: string | null | undefined): ClassifiedVideo | null {
  if (!entry) return null
  const raw = entry.trim()
  if (!raw) return null

  // YouTube: an 11-char id, or any recognizable YouTube URL.
  const yt = extractYouTubeId(raw)
  if (yt && /^[A-Za-z0-9_-]{11}$/.test(yt)) return { id: yt, kind: 'youtube' }

  // Drive: a bare 28/33-char file id, or a Drive share URL we can pull the id from.
  const fromUrl = raw.match(/\/d\/([A-Za-z0-9_-]+)/)?.[1] || raw.match(/[?&]id=([A-Za-z0-9_-]+)/)?.[1]
  const candidate = fromUrl || raw
  if (/^[A-Za-z0-9_-]+$/.test(candidate) && (candidate.length === 28 || candidate.length === 33)) {
    return { id: candidate, kind: 'drive' }
  }
  return null
}

/**
 * YouTube poster thumbnail. hqdefault, NOT maxresdefault — maxres 404s on portrait
 * reels that were never encoded above 720p.
 */
export function youtubePoster(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

export function providerLabel(kind: VideoKind): string {
  return kind === 'youtube' ? 'YouTube' : 'Drive'
}
