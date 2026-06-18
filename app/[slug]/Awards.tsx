'use client'

import { useState } from 'react'

type Props = {
  awards: string[]
  studentName: string
}

export default function Awards({ awards, studentName: _studentName }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (awards.length === 0) return null

  const visibleAwards = expanded ? awards : awards.slice(0, 2)
  const hasMore = awards.length > 2

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
          {visibleAwards.map((award, i) => (
            <div key={i} className={`award-card-v2 reveal d${i + 1}`}>
              <div
                className="award-lemon-stripe"
                style={i > 0 ? { background: '#BA3B41' } : undefined}
              />
              <div className="award-v2-left">
                <div className="award-title">{award}</div>
              </div>
            </div>
          ))}
        </div>

        {hasMore && (
          <button className="awards-expand-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show less' : `View all ${awards.length} awards`}
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
