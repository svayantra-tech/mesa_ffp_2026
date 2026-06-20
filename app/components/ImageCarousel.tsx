'use client'

import { useEffect, useRef, useState } from 'react'

const ROTATE_MS = 5000

export default function ImageCarousel({
  images: raw,
  aspect = '16/9',
}: {
  images: string[]
  aspect?: string
}) {
  const [errored, setErrored] = useState<Set<number>>(new Set())
  const [idx, setIdx] = useState(0)
  const [reduced, setReduced] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const visible = raw
    .map((src, origIdx) => ({ src, origIdx }))
    .filter(({ origIdx }) => !errored.has(origIdx))

  // detect prefers-reduced-motion client-side
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const h = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  useEffect(() => {
    if (visible.length < 2 || reduced) return
    const el = containerRef.current
    let paused = false
    const onEnter = () => { paused = true }
    const onLeave = () => { paused = false }
    el?.addEventListener('mouseenter', onEnter)
    el?.addEventListener('mouseleave', onLeave)
    const t = setInterval(() => {
      if (!paused) setIdx((c) => (c + 1) % visible.length)
    }, ROTATE_MS)
    return () => {
      clearInterval(t)
      el?.removeEventListener('mouseenter', onEnter)
      el?.removeEventListener('mouseleave', onLeave)
    }
  }, [visible.length, reduced])

  if (visible.length === 0) return null

  const safeIdx = idx % visible.length

  // single image or reduced-motion → static, no animation
  if (visible.length === 1 || reduced) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={visible[0].src}
        alt=""
        className="img-carousel-static"
        loading="lazy"
        onError={() => setErrored((prev) => new Set([...prev, visible[0].origIdx]))}
      />
    )
  }

  return (
    <div className="img-carousel" ref={containerRef} style={{ aspectRatio: aspect }}>
      {visible.map(({ src, origIdx }, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={origIdx}
          src={src}
          alt=""
          className={`img-carousel-img${i === safeIdx ? ' ic-active' : ''}`}
          loading="lazy"
          onError={() => setErrored((prev) => new Set([...prev, origIdx]))}
        />
      ))}
      <div className="img-carousel-dots" role="tablist">
        {visible.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === safeIdx}
            aria-label={`Image ${i + 1}`}
            className={`img-carousel-dot${i === safeIdx ? ' ic-dot-active' : ''}`}
            onClick={() => setIdx(i)}
          />
        ))}
      </div>
    </div>
  )
}
