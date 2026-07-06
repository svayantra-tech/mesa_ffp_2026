'use client'

import { useState } from 'react'

function generateAwardDesc(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('bonding') || t.includes('team spirit') || t.includes('teamwork'))
    return 'Awarded for the camaraderie and spirit this team brought to the Future Founder Program every single day.'
  if (t.includes('pitch') || t.includes('presenter') || t.includes('presentation'))
    return 'Recognized for delivering a compelling, persuasive pitch at FFP Demo Day 2026.'
  if (t.includes('innovat') || t.includes('creative') || t.includes('idea'))
    return 'Acknowledged for bringing a genuinely inventive idea to life during FFP 2026.'
  if (t.includes('revenue') || t.includes('sales') || t.includes('top earn'))
    return 'Recognized for generating the highest revenue among all ventures in the FFP 2026 cohort.'
  if (t.includes('customer') || t.includes('market'))
    return 'Awarded for reaching the most customers and proving strong market demand during FFP 2026.'
  if (t.includes('product') || t.includes('design') || t.includes('brand'))
    return 'Recognized for building the standout product of the FFP 2026 cohort.'
  if (t.includes('social') || t.includes('media') || t.includes('content'))
    return 'Awarded for producing high-impact, creative content throughout the Future Founder Program.'
  if (t.includes('leader') || t.includes('mentor'))
    return 'Recognized as a natural leader and anchor for the team throughout the Future Founder Program.'
  if (t.includes('persever') || t.includes('resilient') || t.includes('grit'))
    return 'Awarded for exceptional resilience and grit through every challenge in FFP 2026.'
  return 'Recognized for outstanding performance and contribution during the Future Founder Program 2026.'
}

type Props = {
  awards: string[]
  award_descriptions: string[]
  awardPhoto?: string
}

export default function Awards({ awards, award_descriptions, awardPhoto }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (awards.length === 0) return null

  const hasPhoto = !!awardPhoto && awardPhoto.startsWith('http')

  const cards = awards.map((title, i) => ({
    title,
    description: award_descriptions[i]?.trim() || generateAwardDesc(title),
  }))

  const visibleCards = expanded ? cards : cards.slice(0, 3)
  const hasMore = cards.length > 3

  const stackClass =
    cards.length === 1
      ? 'awards-stack count-1'
      : cards.length === 2
      ? 'awards-stack count-2'
      : 'awards-stack count-3plus'

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

        {hasPhoto && (
          <figure className="award-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={awardPhoto} alt="The team receiving their FFP 2026 award" loading="lazy" />
            <figcaption>Award ceremony &middot; FFP 2026</figcaption>
          </figure>
        )}

        <div className={stackClass}>
          {visibleCards.map((card, i) => (
            <div key={i} className={`award-card-v2 reveal d${Math.min(i + 1, 4)}`}>
              <div className="award-lemon-stripe" />
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
