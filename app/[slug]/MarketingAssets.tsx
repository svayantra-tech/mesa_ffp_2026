'use client'

// Video creatives + static ad images — parent <section> slide is provided by page.tsx
import { useEffect, useRef, useState } from 'react'

function extractYouTubeId(url: string): string | null {
  if (!url) return null
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function extractVideoId(entry: string): string | null {
  const ytId = extractYouTubeId(entry)
  if (ytId) return ytId
  if (/^[a-zA-Z0-9_-]+$/.test(entry) && entry.length > 15) return entry
  return null
}

function getVideoEmbed(id: string): { embedUrl: string; title: string } {
  if (id.length > 15) {
    // Drive file ID
    return {
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
      title: 'Video creative',
    }
  }
  // YouTube ID
  return {
    embedUrl: `https://www.youtube.com/embed/${id}?rel=0`,
    title: 'Video creative',
  }
}

type Props = { videos: string[]; adStatics?: string[] }

export default function MarketingAssets({ videos, adStatics = [] }: Props) {
  const rawVideos = (Array.isArray(videos) ? videos : []).slice(0, 3)
  const videoIds = rawVideos.map(extractVideoId).filter(Boolean) as string[]

  const staticAds = (Array.isArray(adStatics) ? adStatics : [])
    .filter((url) => url.startsWith('http'))
    .slice(0, 5)

  const videoRef = useRef<HTMLDivElement>(null)
  const [loadVideos, setLoadVideos] = useState(false)
  const [erroredAds, setErroredAds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!videoIds.length) return
    const el = videoRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoadVideos(true)
          observer.disconnect()
        }
      },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [videoIds.length])

  const visibleAds = staticAds.filter((_, i) => !erroredAds.has(i))

  if (!videoIds.length && !visibleAds.length) return null

  return (
    <div className="videos-inner">
      {videoIds.length > 0 && (
        <>
          <div className="videos-header">
            <h2 className="sec-heading inv">Video Creatives</h2>
            <p className="sec-intro inv">Portrait reels produced during the 2-week FFP program.</p>
          </div>
          <div className={`videos-grid count-${videoIds.length}`} ref={videoRef}>
            {videoIds.map((id, i) => {
              const { embedUrl, title } = getVideoEmbed(id)
              return (
              <div key={i} className="ma-video-slot">
                {loadVideos ? (
                  <iframe
                    src={embedUrl}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ border: 'none', width: '100%', aspectRatio: '9/16' }}
                  />
                ) : (
                  <button
                    type="button"
                    className="ma-video-cover"
                    onClick={() => setLoadVideos(true)}
                    aria-label={`Play video ${i + 1}`}
                  >
                    <span className="ma-video-play">
                      <svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21" /></svg>
                    </span>
                  </button>
                )}
              </div>
              )
            })}
          </div>
        </>
      )}

      {visibleAds.length > 0 && (
        <div className={`ma-statics-block${videoIds.length > 0 ? ' ma-statics-block--spaced' : ''}`}>
          <div className="videos-header">
            <h2 className="sec-heading inv">Static Ads</h2>
            <p className="sec-intro inv">Performance marketing images produced during the 2-week FFP program.</p>
          </div>
          <div className={`ma-statics-grid count-${visibleAds.length}`}>
            {staticAds.map((src, i) => {
              if (erroredAds.has(i)) return null
              return (
                <div key={i} className="ma-static-slot">
                  {/* Plain img so the frame follows each photo's natural aspect ratio */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Static ad ${i + 1}`}
                    className="ma-static-img"
                    loading="lazy"
                    onError={() => setErroredAds((prev) => new Set([...prev, i]))}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
