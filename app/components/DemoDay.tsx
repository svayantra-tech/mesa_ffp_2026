'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const slot1Images = [
  '/assets/demo-photo-1.jpg',
  '/assets/demo-photo-2.jpg',
  '/assets/demo-photo-3.jpg',
]

const slot2Images = [
  '/assets/demo-photo-4.jpg',
  '/assets/demo-photo-5.jpg',
  '/assets/demo-photo-6.jpg',
]

const CAMERA_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="rgba(15,25,25,0.22)" strokeWidth="1.4">
    <rect x="2" y="2" width="20" height="20" rx="3" />
    <circle cx="8.5" cy="8.5" r="2" />
    <path d="M22 16l-5.5-5.5L5 22" />
  </svg>
)

function CyclingSlot({ images, interval }: { images: string[]; interval: number }) {
  const [idx, setIdx] = useState(0)
  const [fadingIn, setFadingIn] = useState(false)
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(new Set())

  const handleError = useCallback((src: string) => {
    setFailedSrcs(prev => {
      const next = new Set(prev)
      next.add(src)
      return next
    })
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setFadingIn(true)
      setTimeout(() => {
        setIdx(prev => (prev + 1) % images.length)
        setFadingIn(false)
      }, 1200)
    }, interval)
    return () => clearInterval(timer)
  }, [images.length, interval])

  const currentSrc = images[idx]
  const nextSrc = images[(idx + 1) % images.length]
  const currentFailed = failedSrcs.has(currentSrc)
  const nextFailed = failedSrcs.has(nextSrc)

  return (
    <div className="dd-photo-slot">
      <div className="dd-photo-layer" style={{ opacity: fadingIn ? 0 : 1 }}>
        {currentFailed ? (
          <div className="dd-photo-placeholder">{CAMERA_ICON}</div>
        ) : (
          <img
            src={currentSrc}
            alt="Demo Day"
            onError={() => handleError(currentSrc)}
          />
        )}
      </div>
      <div className="dd-photo-layer" style={{ opacity: fadingIn ? 1 : 0 }}>
        {nextFailed ? (
          <div className="dd-photo-placeholder">{CAMERA_ICON}</div>
        ) : (
          <img
            src={nextSrc}
            alt="Demo Day"
            onError={() => handleError(nextSrc)}
          />
        )}
      </div>
    </div>
  )
}

export default function DemoDay() {
  const videoRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [videoLoaded, setVideoLoaded] = useState(false)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting && !videoLoaded) {
            setVideoLoaded(true)
          }
        })
      },
      { threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [videoLoaded])

  useEffect(() => {
    if (videoLoaded && iframeRef.current) {
      const src = iframeRef.current.getAttribute('data-src')
      if (src) iframeRef.current.src = src
    }
  }, [videoLoaded])

  return (
    <section id="demo-day" className="dd-section" style={{ minHeight: '760px' }}>
      {/* LAYER 1 — diagonal cream panel */}
      <div className="dd-diag">
        <div style={{ paddingTop: '80px' }}>
          <div className="section-num">02</div>
          <div className="section-num-small">How they pitched</div>
          <h2 className="section-title">DEMO DAY <span className="light">to Tier-1 VCs</span></h2>
          <p className="dd-desc">
            Students took the stage to pitch their ventures to venture
            capitalists from Tier-1 VCs — defending their numbers,
            business models, and growth strategy.
          </p>
          <div className="dd-quote">
            Every team had 5 minutes to pitch, 3 minutes for Q&amp;A.
            Judges scored on revenue, presentation quality, and growth
            strategy. Winners earned recognition across the entire cohort.
          </div>
        </div>
      </div>

      {/* LAYER 2 — right side content */}
      <div className="dd-content">
        {/* Video slot */}
        <div className="dd-video" ref={videoRef}>
          {!videoLoaded && (
            <div className="dd-video-cover">
              <div className="dd-video-play">
                <svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21" /></svg>
              </div>
              <span className="dd-video-label">Demo Day Highlights</span>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src="about:blank"
            data-src="https://www.youtube.com/embed/VIDEO_ID?enablejsapi=1&autoplay=1&mute=1&loop=1"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="dd-video-iframe"
          />
        </div>

        {/* Cycling photo slots */}
        <div className="dd-photos-row">
          <CyclingSlot images={slot1Images} interval={3000} />
          <CyclingSlot images={slot2Images} interval={3800} />
        </div>

        {/* Stats bar */}
        <div className="dd-stats">
          <div className="dd-chip">
            <span className="dd-chip-val">29</span>
            <span className="dd-chip-lbl">Ventures</span>
          </div>
          <div className="dd-chip">
            <span className="dd-chip-val">8</span>
            <span className="dd-chip-lbl">Awards</span>
          </div>
          <div className="dd-chip">
            <span className="dd-chip-val">5 min</span>
            <span className="dd-chip-lbl">Per Pitch</span>
          </div>
          <div className="dd-chip">
            <span className="dd-chip-val">3</span>
            <span className="dd-chip-lbl">VC Judges</span>
          </div>
        </div>
      </div>
    </section>
  )
}
