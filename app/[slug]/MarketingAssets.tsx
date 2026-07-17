'use client'

// Video creatives + static ad images — parent <section> slide is provided by page.tsx.
//
// ALL videos autoplay MUTED simultaneously when scrolled into view, and pause
// when they leave:
//   • YouTube: controlled via the IFrame API (enablejsapi + postMessage
//     playVideo/pauseVideo/mute/unMute).
//   • Google Drive: Drive's embed has no parent-page control API, so this is
//     BEST-EFFORT — the iframe is (re)loaded with ?autoplay=1 when it scrolls
//     into view, and a tap-to-play affordance stays available in case Drive
//     silently ignores autoplay.
import { useCallback, useEffect, useRef, useState } from 'react'

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

type VideoItem = { id: string; kind: 'youtube' | 'drive' }

function classifyVideo(entry: string): VideoItem | null {
  const yt = extractYouTubeId(entry)
  if (yt) return { id: yt, kind: 'youtube' }
  // A bare long token is a Google Drive file id (Drive ids are >15 chars).
  if (/^[a-zA-Z0-9_-]+$/.test(entry) && entry.length > 15) return { id: entry, kind: 'drive' }
  return null
}

const PlayGlyph = () => (
  <svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21" /></svg>
)

// ── YouTube tile: real play/pause/mute control via the IFrame API ──────────────

function YouTubeTile({ id, active, muted }: { id: string; active: boolean; muted: boolean }) {
  const ref = useRef<HTMLIFrameElement>(null)

  const command = useCallback((func: string) => {
    ref.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*'
    )
  }, [])

  useEffect(() => { command(active ? 'playVideo' : 'pauseVideo') }, [active, command])
  useEffect(() => { command(muted ? 'mute' : 'unMute') }, [muted, command])

  return (
    <iframe
      ref={ref}
      className="ma-video-frame"
      // enablejsapi=1 unlocks postMessage control; start muted + not autoplaying.
      src={`https://www.youtube.com/embed/${id}?enablejsapi=1&mute=1&autoplay=0&playsinline=1&rel=0&controls=1`}
      title="Video creative"
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      onLoad={() => {
        command('mute')
        if (active) command('playVideo')
      }}
    />
  )
}

// ── Drive tile: best-effort autoplay + persistent tap-to-play fallback ─────────

function DriveTile({ id, active }: { id: string; active: boolean }) {
  const [forced, setForced] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [prevActive, setPrevActive] = useState(active)

  // Scrolling a tile out of view drops its forced-play so only the in-view video
  // is loaded/playing (Drive can't be paused via API, so we unmount to stop it).
  // Adjust-state-during-render (not an effect) per the React docs' prev-value pattern.
  if (active !== prevActive) {
    setPrevActive(active)
    if (!active) setForced(false)
  }

  const playing = active || forced

  if (!playing) {
    return (
      <button type="button" className="ma-video-cover" onClick={() => setForced(true)} aria-label="Play video">
        <span className="ma-video-play"><PlayGlyph /></span>
      </button>
    )
  }

  return (
    <>
      <iframe
        key={reloadKey}
        className="ma-video-frame"
        src={`https://drive.google.com/file/d/${id}/preview?autoplay=1`}
        title="Video creative"
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
      />
      {/* Fallback: if Drive ignored autoplay, tap to reload the frame with a user
          gesture (or just use Drive's own play button inside the frame). */}
      <button
        type="button"
        className="ma-video-tap"
        onClick={() => setReloadKey((k) => k + 1)}
        aria-label="Tap to play"
        title="Tap to play"
      >
        <PlayGlyph />
      </button>
    </>
  )
}

// ── Section ────────────────────────────────────────────────────────────────────

type Props = { videos: string[]; adStatics?: string[] }

export default function MarketingAssets({ videos, adStatics = [] }: Props) {
  const items = (Array.isArray(videos) ? videos : [])
    .slice(0, 3)
    .map(classifyVideo)
    .filter((v): v is VideoItem => v !== null)

  const staticAds = (Array.isArray(adStatics) ? adStatics : [])
    .filter((url) => url.startsWith('http'))
    .slice(0, 5)

  const sectionRef = useRef<HTMLDivElement>(null)
  const tileRefs = useRef<(HTMLDivElement | null)[]>([])
  const ratios = useRef<Record<number, number>>({})
  const [loaded, setLoaded] = useState(false)
  const [activeTiles, setActiveTiles] = useState<Set<number>>(new Set())
  const [muted, setMuted] = useState(true)
  const [erroredAds, setErroredAds] = useState<Set<number>>(new Set())

  const hasYouTube = items.some((it) => it.kind === 'youtube')

  // Load the players a little before they enter the viewport (avoid eager iframes).
  useEffect(() => {
    if (!items.length || loaded) return
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoaded(true)
          io.disconnect()
        }
      },
      { rootMargin: '400px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [items.length, loaded])

  // Once loaded, track which tiles are >= 50% visible — ALL visible tiles play
  // simultaneously (muted). When a tile scrolls out it pauses.
  useEffect(() => {
    if (!loaded || !items.length) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const idx = Number((e.target as HTMLElement).dataset.vidx)
          ratios.current[idx] = e.isIntersecting ? e.intersectionRatio : 0
        }
        const next = new Set<number>()
        for (const [k, v] of Object.entries(ratios.current)) {
          if (v >= 0.5) next.add(Number(k))
        }
        setActiveTiles((prev) => {
          // Only update state if the set actually changed to avoid unnecessary re-renders
          if (prev.size === next.size && [...prev].every((v) => next.has(v))) return prev
          return next
        })
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    )
    tileRefs.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
  }, [loaded, items.length])

  const visibleAds = staticAds.filter((_, i) => !erroredAds.has(i))

  if (!items.length && !visibleAds.length) return null

  return (
    <div className="videos-inner">
      {items.length > 0 && (
        <>
          <div className="videos-header">
            <h2 className="sec-heading inv">Video Creatives</h2>
            <p className="sec-intro inv">Portrait reels produced during the 2-week FFP program.</p>
          </div>
          <div className={`videos-grid count-${items.length}`} ref={sectionRef}>
            {items.map((it, i) => (
              <div
                key={i}
                className="ma-video-slot"
                data-vidx={i}
                ref={(el) => { tileRefs.current[i] = el }}
              >
                {!loaded ? (
                  <button
                    type="button"
                    className="ma-video-cover"
                    onClick={() => setLoaded(true)}
                    aria-label={`Play video ${i + 1}`}
                  >
                    <span className="ma-video-play"><PlayGlyph /></span>
                  </button>
                ) : it.kind === 'youtube' ? (
                  <>
                    <YouTubeTile id={it.id} active={activeTiles.has(i)} muted={muted} />
                    <button
                      type="button"
                      className="ma-mute-btn"
                      onClick={() => setMuted((m) => !m)}
                      aria-label={muted ? 'Unmute' : 'Mute'}
                      title={muted ? 'Unmute' : 'Mute'}
                    >
                      {muted ? (
                        <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 5V4L8 9H4z" /><path d="M16 8l6 8M22 8l-6 8" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
                      ) : (
                        <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 5V4L8 9H4z" /><path d="M16 8a5 5 0 010 8" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" /></svg>
                      )}
                    </button>
                  </>
                ) : (
                  <DriveTile id={it.id} active={activeTiles.has(i)} />
                )}
              </div>
            ))}
          </div>
          {hasYouTube && (
            <p className="ma-video-hint">All videos autoplay muted — tap a speaker to hear that one.</p>
          )}
        </>
      )}

      {visibleAds.length > 0 && (
        <div className={`ma-statics-block${items.length > 0 ? ' ma-statics-block--spaced' : ''}`}>
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
