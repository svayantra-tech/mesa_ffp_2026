'use client'

// Video creatives + static ad images — parent <section> slide is provided by page.tsx.
//
// ALL videos in the grid autoplay MUTED, simultaneously, once the section scrolls into
// view — not one-at-a-time. (Browsers require muted for autoplay, so they start muted.)
//   • YouTube: each tile owns a per-video mute toggle (IFrame API mute/unMute), so
//     tapping one speaker unmutes just that video, not all of them.
//   • Google Drive (legacy / a few cohort-2 brands): no parent-page control API, so the
//     iframe is loaded with ?autoplay=1 — best-effort, with a tap-to-reload fallback.
import { useCallback, useEffect, useRef, useState } from 'react'
import { classifyVideo, type ClassifiedVideo } from '@/lib/video'

type VideoItem = ClassifiedVideo

const PlayGlyph = () => (
  <svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21" /></svg>
)

// ── YouTube tile: autoplay muted via the IFrame API, with its own mute toggle ──────

function YouTubeTile({ id, play }: { id: string; play: boolean }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [muted, setMuted] = useState(true)

  const command = useCallback((func: string) => {
    ref.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: [] }),
      '*'
    )
  }, [])

  useEffect(() => { command(play ? 'playVideo' : 'pauseVideo') }, [play, command])
  useEffect(() => { command(muted ? 'mute' : 'unMute') }, [muted, command])

  return (
    <>
      <iframe
        ref={ref}
        className="ma-video-frame"
        // enablejsapi=1 unlocks postMessage control; muted autoplay is browser-allowed.
        src={`https://www.youtube.com/embed/${id}?enablejsapi=1&mute=1&autoplay=1&playsinline=1&rel=0&controls=1`}
        title="Video creative"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        onLoad={() => {
          command('mute')
          if (play) command('playVideo')
        }}
      />
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
  )
}

// ── Drive tile: best-effort autoplay + persistent tap-to-reload fallback ───────────

function DriveTile({ id, play }: { id: string; play: boolean }) {
  const [reloadKey, setReloadKey] = useState(0)

  if (!play) {
    return (
      <div className="ma-video-cover">
        <span className="ma-video-play"><PlayGlyph /></span>
      </div>
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
    .map(classifyVideo)
    .filter((v): v is VideoItem => v !== null)

  const staticAds = (Array.isArray(adStatics) ? adStatics : [])
    .filter((url) => url.startsWith('http'))

  const sectionRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [erroredAds, setErroredAds] = useState<Set<number>>(new Set())

  const hasYouTube = items.some((it) => it.kind === 'youtube')

  // Load + start ALL players a little before the section enters the viewport. Once
  // loaded, every video plays simultaneously (muted) — not one-at-a-time.
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
              <div key={i} className="ma-video-slot">
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
                  <YouTubeTile id={it.id} play={loaded} />
                ) : (
                  <DriveTile id={it.id} play={loaded} />
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
