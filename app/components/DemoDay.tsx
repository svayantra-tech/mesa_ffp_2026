'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

const CAMERA_ICON = (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="rgba(15,25,25,0.22)" strokeWidth="1.4">
    <rect x="2" y="2" width="20" height="20" rx="3" />
    <circle cx="8.5" cy="8.5" r="2" />
    <path d="M22 16l-5.5-5.5L5 22" />
  </svg>
)

function PhotoSlot({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="dd-photo-slot">
        <div className="dd-photo-placeholder">{CAMERA_ICON}</div>
      </div>
    )
  }

  return (
    <div className="dd-photo-slot">
      <Image
        src={src}
        alt="Demo Day"
        fill
        quality={100}
        sizes="(max-width: 900px) 50vw, 320px"
        style={{ objectFit: 'cover' }}
        onError={() => setFailed(true)}
      />
    </div>
  )
}

interface DemoDayProps {
  demoVideoId?: string | null
  demoPhotos?: string[]
}

export default function DemoDay({ demoVideoId, demoPhotos = [] }: DemoDayProps) {
  const videoRef = useRef<HTMLDivElement>(null)
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
          {videoLoaded && demoVideoId && (
            <iframe
              src={`https://www.youtube.com/embed/${demoVideoId}?enablejsapi=1&autoplay=1&mute=1&loop=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="dd-video-iframe"
            />
          )}
        </div>

        {/* Photo slots */}
        <div className="dd-photos-row">
          <PhotoSlot src={demoPhotos[0]} />
          <PhotoSlot src={demoPhotos[1]} />
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
