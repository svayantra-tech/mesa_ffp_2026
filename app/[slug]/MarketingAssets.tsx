'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

function extractYouTubeId(url: string): string | null {
  if (!url) return null
  if (url.includes('instagram.com')) return null
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
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url
  return null
}

function isDirectImageUrl(url: string): boolean {
  if (!url) return false
  if (url.includes('instagram.com')) return false
  return true
}

type Props = {
  videos: string[]
  adStatics: string[]
}

export default function MarketingAssets({ videos, adStatics }: Props) {
  // Guard: only ever work with arrays.
  const rawVideos = (Array.isArray(videos) ? videos : []).slice(0, 3)
  const rawAds = (Array.isArray(adStatics) ? adStatics : []).slice(0, 2)

  const videoIds = rawVideos
    .map((url) => extractYouTubeId(url))
    .filter(Boolean) as string[]

  const adImages = rawAds.filter((url) => url && isDirectImageUrl(url))

  const hasVideos = videoIds.length > 0
  const hasAds = adImages.length > 0

  // Mount the YouTube iframes only once the grid is near the viewport (keeps
  // them off the initial page load) — but reliably, via IntersectionObserver
  // rather than native lazy iframes, which can fail to fire inside the
  // reveal-animated, below-the-fold section.
  const videoRef = useRef<HTMLDivElement>(null)
  const [loadVideos, setLoadVideos] = useState(false)

  useEffect(() => {
    if (!hasVideos) return
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
  }, [hasVideos])

  if (!hasVideos && !hasAds) return null

  return (
    <section id="assets" className="on-cream reveal portfolio-section">
      <div className="sec-tag">10 — Marketing Assets Built</div>
      <h2 className="sec-h">Marketing Assets Built</h2>
      <p className="sec-sub">Videos and ad creatives produced during the 2-week FFP program.</p>

      {/* VIDEO SLOTS */}
      {hasVideos && (
        <div className="asset-cat reveal d1">
          <div className="asset-cat-header">
            <svg viewBox="0 0 13 13"><polygon points="2,2 11,6.5 2,11" /></svg>
            Video Creatives
          </div>
          <div className="ma-video-grid" ref={videoRef}>
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
      )}

      {/* AD STATIC SLOTS */}
      {hasAds && (
        <div className="asset-cat reveal d2" style={{ marginBottom: 0 }}>
          <div className="asset-cat-header">
            <svg viewBox="0 0 13 13">
              <rect x="1" y="1" width="11" height="11" rx="2" />
              <circle cx="4" cy="4" r="1.5" />
              <path d="M1 9l3-3 3 2 2-3 4 4" />
            </svg>
            Ad Statics
          </div>
          <div className="ma-ad-grid">
            {adImages.map((url, i) => (
              <div key={i} className="ma-ad-slot">
                <Image
                  src={url}
                  alt={`Ad creative ${i + 1}`}
                  width={0}
                  height={0}
                  sizes="(max-width: 900px) 100vw, 420px"
                  quality={100}
                  style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
