'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AdminBrand } from '@/lib/admin-data'

const BASE = '/admin-mesa-portfolio-6300'

export default function VenturesList({ brands }: { brands: AdminBrand[] }) {
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
            <div>
              <Link href={`${BASE}/ventures/${b.id}`}>{b.name}</Link>
              <div className="admin-list-meta">
                /{b.slug} · ₹{b.revenue.toLocaleString('en-IN')} · {b.customers} customers ·{' '}
                {b.flea_photos.length + b.demo_photos.length + b.ad_statics.length} images
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
