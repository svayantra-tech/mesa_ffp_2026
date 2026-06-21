'use client'

import { useEffect, useRef, useState } from 'react'

const ROTATE_MS_FEW = 5000
const ROTATE_MS_MANY = 3500
const DOTS_THRESHOLD = 6

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

  const useDots = visible.length <= DOTS_THRESHOLD
  const rotateMs = visible.length > DOTS_THRESHOLD ? ROTATE_MS_MANY : ROTATE_MS_FEW

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
    if (!el) return

    let inView = false
    let hovered = false
    let t: ReturnType<typeof setInterval> | null = null

    function startTimer() {
      if (t) return
      t = setInterval(() => {
        if (!hovered) setIdx((c) => (c + 1) % visible.length)
      }, rotateMs)
    }
    function stopTimer() {
      if (t) { clearInterval(t); t = null }
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting
        inView ? startTimer() : stopTimer()
      },
      { threshold: 0.3 }
    )
    io.observe(el)

    const onEnter = () => { hovered = true }
    const onLeave = () => { hovered = false }
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)

    return () => {
      stopTimer()
      io.disconnect()
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [visible.length, reduced, rotateMs])

  if (visible.length === 0) return null

  const safeIdx = idx % visible.length

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

      {useDots ? (
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
      ) : (
        <div className="img-carousel-counter">
          {safeIdx + 1} / {visible.length}
        </div>
      )}
    </div>
  )
}
