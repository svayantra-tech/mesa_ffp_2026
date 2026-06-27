'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AdminBrand } from '@/lib/db/queries'

function completionScore(b: AdminBrand): number {
  return Math.round(
    [b.videos.length > 0, b.ad_statics.length > 0]
      .filter(Boolean).length / 2 * 100
  )
}

function CompletionRing({ pct }: { pct: number }) {
  const r = 13
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 80 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" style={{ flexShrink: 0 }}>
      <circle cx="17" cy="17" r={r} fill="none" stroke="#e8e0cc" strokeWidth="3" />
      <circle
        cx="17" cy="17" r={r} fill="none"
        stroke={color} strokeWidth="3"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 17 17)"
      />
      <text x="17" y="21" textAnchor="middle" fontSize="7.5" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  )
}

export default function VenturesList({ cohort, brands }: { cohort: string; brands: AdminBrand[] }) {
  const BASE = `/${cohort}/admin-mesa-portfolio-6300`
  const [q, setQ] = useState('')
  const filtered = brands.filter((b) => {
    const t = q.toLowerCase()
    if (!t) return true
    return b.name.toLowerCase().includes(t) || b.slug.toLowerCase().includes(t)
  })

  return (
    <>
      <input
        className="admin-input admin-search"
        placeholder="Search ventures..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="admin-list">
        {filtered.map((b) => (
          <div key={b.id} className="admin-list-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CompletionRing pct={completionScore(b)} />
              <div>
                <Link href={`${BASE}/ventures/${b.id}`}>{b.name}</Link>
                <div className="admin-list-meta">
                  /{b.slug} · ₹{b.revenue.toLocaleString('en-IN')} · {b.customers} customers ·{' '}
                  {b.ad_statics.length} ad statics
                </div>
              </div>
            </div>
            <Link href={`${BASE}/ventures/${b.id}`} className="admin-btn admin-btn-sm">Edit</Link>
          </div>
        ))}
        {filtered.length === 0 && <p className="admin-sub">No ventures match.</p>}
      </div>
    </>
  )
}
