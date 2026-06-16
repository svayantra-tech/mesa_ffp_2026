'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AdminStudent } from '@/lib/admin-data'

const BASE = '/admin-mesa-portfolio-6300'

export default function StudentsList({ students }: { students: AdminStudent[] }) {
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
            <div>
              <Link href={`${BASE}/students/${s.id}`}>{s.name}</Link>
              <div className="admin-list-meta">
                /{s.slug} · {s.brandName || 'No venture'}
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
