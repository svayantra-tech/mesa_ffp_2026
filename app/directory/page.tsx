'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Student = {
  slug: string
  name: string
  brand: { name: string; description: string } | null
}

export default function DirectoryPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('students')
      .select('slug, name, brand:brands(name, description)')
      .order('name')
      .then(({ data }) => {
        setStudents((data as any) || [])
        setLoading(false)
      })
  }, [])

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      s.name.toLowerCase().includes(q) ||
      (s.brand?.name || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="directory-page">
      <nav>
        <div className="nav-left">
          <Link href="/">
            <img src="/assets/mesa-logo.png" alt="Mesa School of Business" className="nav-logo" />
          </Link>
        </div>
        <div className="nav-center">
          <Link href="/">Home</Link>
          <a href="#" style={{ color: '#BA3B41' }}>Directory</a>
        </div>
        <Link href="/" className="nav-cta">
          <svg viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to Home
        </Link>
      </nav>

      <div className="directory-header">
        <div className="section-num-small">Student Directory</div>
        <h1 className="section-title" style={{ marginBottom: '8px' }}>ALL <span className="light">Students</span></h1>
        <p className="section-sub" style={{ maxWidth: '500px', margin: '0 auto 32px' }}>
          113 students across 29 ventures. Search by name or venture to find a portfolio.
        </p>
        <input
          type="text"
          className="directory-search"
          placeholder="Search by student name or venture..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="directory-count">
          {loading ? 'Loading...' : `${filtered.length} student${filtered.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      <div className="directory-grid">
        {filtered.map(student => (
          <Link key={student.slug} href={`/${student.slug}`} className="directory-card">
            <div className="directory-card-name">{student.name}</div>
            <div className="directory-card-venture">{student.brand?.name || 'Unknown Venture'}</div>
            <div className="directory-card-link">View Portfolio &rarr;</div>
          </Link>
        ))}
      </div>

      <footer>
        <div className="footer-l">
          <div className="footer-mark">
            <svg viewBox="0 0 20 20" fill="none">
              <rect x="3" y="11" width="14" height="2" rx="1" fill="white" />
              <rect x="3" y="7.5" width="14" height="2" rx="1" fill="white" />
              <rect x="6" y="3" width="8" height="5" rx="1.5" fill="none" stroke="white" strokeWidth="1.4" />
            </svg>
          </div>
          Built by <a href="https://mesaschool.co">Mesa School of Business</a> &nbsp;&middot;&nbsp; FFP 2026
        </div>
        <div className="footer-r">ffp.mesaschool.co</div>
      </footer>
    </div>
  )
}
