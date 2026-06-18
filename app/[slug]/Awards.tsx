'use client'

import { useState } from 'react'

const FALLBACK_DESC = 'Recognized during the Future Founder Program for standout performance.'

type Props = {
  awards: string[]
  award_descriptions: string[]
  studentName: string
}

export default function Awards({ awards, award_descriptions, studentName: _studentName }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (awards.length === 0) return null

  const cards = awards.map((title, i) => ({
    title,
    description: award_descriptions[i]?.trim() || FALLBACK_DESC,
  }))

  const visibleCards = expanded ? cards : cards.slice(0, 3)
  const hasMore = cards.length > 3

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
        <p className="sec-sub inv" style={{ marginBottom: 32 }}>
          Earned during FFP 2026.
        </p>

        <div className="awards-stack">
          {visibleCards.map((card, i) => (
            <div key={i} className={`award-card-v2 reveal d${Math.min(i + 1, 4)}`}>
              <div
                className="award-lemon-stripe"
                style={i > 0 ? { background: '#BA3B41' } : undefined}
              />
              <div className="award-icon">
                <svg viewBox="0 0 20 20">
                  <path d="M10 2l2.2 4.5 5 .7-3.6 3.5.85 4.95L10 13.4l-4.45 2.25.85-4.95L2.8 7.2l5-.7z" />
                </svg>
              </div>
              <div className="award-v2-left">
                <div className="award-title">{card.title}</div>
                <p className="award-desc">{card.description}</p>
              </div>
            </div>
          ))}
        </div>

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
    </section>
  )
}
