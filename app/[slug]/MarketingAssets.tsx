'use client'

// Videos only — the parent <section> slide is provided by page.tsx
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

type Props = { videos: string[] }

export default function MarketingAssets({ videos }: Props) {
  const rawVideos = (Array.isArray(videos) ? videos : []).slice(0, 3)
  const videoIds = rawVideos.map(extractYouTubeId).filter(Boolean) as string[]

  const videoRef = useRef<HTMLDivElement>(null)
  const [loadVideos, setLoadVideos] = useState(false)

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

  if (!videoIds.length) return null

  return (
    <div className="videos-inner">
      <div className="videos-header">
        <h2 className="sec-heading inv">Video Creatives</h2>
        <p className="sec-intro inv">Portrait reels produced during the 2-week FFP program.</p>
      </div>
      <div className={`videos-grid count-${videoIds.length}`} ref={videoRef}>
        {videoIds.map((id, i) => (
          <div key={i} className="ma-video-slot">
            {loadVideos ? (
              <iframe
                src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1`}
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={`Video ${i + 1}`}
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
        ))}
      </div>
    </div>
  )
}
