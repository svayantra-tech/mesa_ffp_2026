'use client'

import { useState } from 'react'
import Link from 'next/link'

type Student = {
  slug: string
  name: string
  brand: { name: string; description: string } | null
}

export default function DirectoryClient({
  students,
  ventureCount,
  cohort,
}: {
  students: Student[]
  ventureCount: number
  cohort: string
}) {
  const [search, setSearch] = useState('')

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      s.name.toLowerCase().includes(q) ||
      (s.brand?.name || '').toLowerCase().includes(q)
    )
  })

  return (
    <>
      <div className="directory-header">
        <div className="section-num-small">Student Directory</div>
        <h1 className="section-title" style={{ marginBottom: '8px' }}>ALL <span className="light">Students</span></h1>
        <p className="section-sub" style={{ maxWidth: '500px', margin: '0 auto 32px' }}>
          {students.length} students across {ventureCount} ventures. Search by name or venture to find a portfolio.
        </p>
        <input
          type="text"
          className="directory-search"
          placeholder="Search by student name or venture..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="directory-count">
          {filtered.length} student{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="directory-grid">
        {filtered.map(student => (
          <Link key={student.slug} href={`/${cohort}/${student.slug}`} className="directory-card">
            <div className="directory-card-name">{student.name}</div>
            <div className="directory-card-venture">{student.brand?.name || 'Unknown Venture'}</div>
            <div className="directory-card-link">View Portfolio &rarr;</div>
          </Link>
        ))}
      </div>
    </>
  )
}
