'use client'

import { useState, useRef, useEffect } from 'react'

type Props = {
  awards: string[]
  award_descriptions: string[]
  awardPhoto?: string
}

export default function Awards({ awards, award_descriptions, awardPhoto }: Props) {
  const [expanded, setExpanded] = useState(false)
  const colRef = useRef<HTMLDivElement>(null)

  // The page-level IntersectionObserver only runs once at load, so dynamically
  // added cards (e.g. the 4th award after expanding) never get observed and
  // stay at opacity:0.  We run our own observer scoped to the awards column
  // that re-observes every time the visible cards change.
  useEffect(() => {
    const col = colRef.current
    if (!col) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('visible')
        })
      },
      { threshold: 0.12 },
    )
    col.querySelectorAll('.reveal').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [expanded])

  if (awards.length === 0) return null

  const hasPhoto = !!awardPhoto && awardPhoto.startsWith('http')

  // Description shows ONLY real curated copy — never a fabricated line. Empty today
  // for both cohorts, so cards render title-only until real descriptions are added.
  const cards = awards.map((title, i) => ({
    title,
    description: award_descriptions[i]?.trim() || '',
  }))

  const visibleCards = expanded ? cards : cards.slice(0, 3)
  const hasMore = cards.length > 3

  // Layout: any photo → two-column spread (photo left, cards stacked right) — fills the
  // row for 1, 2, or 3+ cards, so a single-award brand has no empty right column.
  // No photo → full-width cards.
  const mode = hasPhoto ? 'm-spread' : 'm-cards'

  const photo = hasPhoto ? (
    <figure className="award-photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={awardPhoto} alt="The team receiving their FFP 2026 award" loading="lazy" />
      <figcaption>Award ceremony &middot; FFP 2026</figcaption>
    </figure>
  ) : null

  return (
    <section
      id="awards"
      className="slide awards-section"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <div className="awards-bg-text">Awards</div>
      <div className="awards-wrap">
        <h2 className="sec-h inv" style={{ marginBottom: 6 }}>
          Recognition &amp; Awards
        </h2>
        <p className="sec-sub inv" style={{ marginBottom: 36 }}>
          Earned during FFP 2026.
        </p>

        <div className={`awards-spread ${mode}`}>
          {photo}
          <div className="awards-col" ref={colRef}>
            {visibleCards.map((card, i) => (
              <div key={card.title} className={`award-card-v2 reveal d${Math.min(i + 1, 4)}`}>
                <div className="award-lemon-stripe" />
                <div className="award-icon">
                  <svg viewBox="0 0 20 20">
                    <path d="M10 2l2.2 4.5 5 .7-3.6 3.5.85 4.95L10 13.4l-4.45 2.25.85-4.95L2.8 7.2l5-.7z" />
                  </svg>
                </div>
                <div className="award-v2-left">
                  <div className="award-title">{card.title}</div>
                  {card.description && <p className="award-desc">{card.description}</p>}
                </div>
              </div>
            ))}

            {hasMore && (
              <button className="awards-expand-btn" onClick={() => setExpanded(!expanded)}>
                {expanded ? 'Show less' : `View all ${cards.length} awards`}
                <svg
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                >
                  <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
