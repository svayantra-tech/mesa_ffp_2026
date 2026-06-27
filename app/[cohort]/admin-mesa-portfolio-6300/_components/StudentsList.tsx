'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AdminStudent } from '@/lib/db/queries'

function studentScore(s: AdminStudent): number {
  return Math.round((s.mediaScore + (s.certificate_url ? 1 : 0) + (s.email ? 1 : 0)) / 7 * 100)
}

function StudentRing({ pct }: { pct: number }) {
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

export default function StudentsList({ cohort, students }: { cohort: string; students: AdminStudent[] }) {
  const BASE = `/${cohort}/admin-mesa-portfolio-6300`
  const [q, setQ] = useState('')
  const filtered = students.filter((s) => {
    const t = q.toLowerCase()
    if (!t) return true
    return s.name.toLowerCase().includes(t) || s.brandName.toLowerCase().includes(t) || s.slug.toLowerCase().includes(t)
  })

  return (
    <>
      <input
        className="admin-input admin-search"
        placeholder="Search students by name, venture, or slug..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="admin-list">
        {filtered.map((s) => (
          <div key={s.id} className="admin-list-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <StudentRing pct={studentScore(s)} />
              <div>
                <Link href={`${BASE}/students/${s.id}`}>{s.name}</Link>
                <div className="admin-list-meta">
                  /{s.slug} · {s.brandName || 'No venture'} {!s.certificate_url ? '· ⚠ no cert' : ''}
                </div>
              </div>
            </div>
            <Link href={`${BASE}/students/${s.id}`} className="admin-btn admin-btn-sm">Edit</Link>
          </div>
        ))}
        {filtered.length === 0 && <p className="admin-sub">No students match.</p>}
      </div>
    </>
  )
}
