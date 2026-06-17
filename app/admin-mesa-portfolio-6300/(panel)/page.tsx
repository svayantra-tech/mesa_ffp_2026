import Link from 'next/link'
import { listStudents, listBrands } from '@/lib/admin-data'
import CompletionDonut from '../_components/CompletionDonut'

export const dynamic = 'force-dynamic'

const BASE = '/admin-mesa-portfolio-6300'

const FIELD_LABELS: Record<string, string> = {
  product_photo: 'product photo',
  videos: 'videos',
  ad_statics: 'ad statics',
  flea_photos: 'flea photos',
  demo_photos: 'demo photos',
}

function Pill({ pct }: { pct: number }) {
  const color = pct === 100 ? '#22c55e' : pct > 0 ? '#f59e0b' : '#ef4444'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 12px', borderRadius: 999, fontWeight: 700, fontSize: 12,
      background: `${color}22`, color, flexShrink: 0,
    }}>
      {pct}%
    </span>
  )
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: 'rgba(15,25,25,0.6)' }}><strong style={{ color: '#0F1919' }}>{value}</strong> {label}</span>
    </div>
  )
}

export default async function DashboardPage() {
  const [students, brands] = await Promise.all([listStudents(), listBrands()])

  // Per-brand completion
  const brandStats = Object.fromEntries(brands.map((b) => {
    const fields: Record<string, boolean> = {
      product_photo: !!b.product_photo,
      videos: b.videos.length > 0,
      ad_statics: b.ad_statics.length > 0,
      flea_photos: b.flea_photos.length > 0,
      demo_photos: b.demo_photos.length > 0,
    }
    const metCount = Object.values(fields).filter(Boolean).length
    const missing = Object.entries(fields).filter(([, v]) => !v).map(([k]) => FIELD_LABELS[k])
    return [b.id, { metCount, pct: Math.round(metCount / 5 * 100), missing }]
  }))

  // Group students by brand_id
  const studentsByBrand: Record<string, typeof students> = {}
  for (const s of students) {
    const key = s.brand_id ?? '__none__'
    ;(studentsByBrand[key] ??= []).push(s)
  }

  // Venture entries sorted lowest % first
  const ventures = brands.map((b) => {
    const stats = brandStats[b.id]
    const brandStudents = studentsByBrand[b.id] ?? []
    return {
      id: b.id,
      name: b.name,
      pct: stats.pct,
      missing: stats.missing,
      students: brandStudents.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        hasCert: !!s.certificate_url,
        pct: Math.round((stats.metCount + (s.certificate_url ? 1 : 0) + (s.email ? 1 : 0)) / 7 * 100),
      })),
    }
  }).sort((a, b) => a.pct - b.pct)

  // Summary stats
  const complete100 = brands.filter((b) => brandStats[b.id].metCount === 5).length
  const zero = brands.filter((b) => brandStats[b.id].metCount === 0).length
  const partial = brands.length - complete100 - zero

  // Overall %: (brand fields met + student cert/email met) / total possible
  const totalBrandMet = brands.reduce((acc, b) => acc + brandStats[b.id].metCount, 0)
  const totalStudentMet = students.reduce((acc, s) => acc + (s.certificate_url ? 1 : 0) + (s.email ? 1 : 0), 0)
  const totalPossible = brands.length * 5 + students.length * 2
  const overallPct = totalPossible > 0 ? Math.round((totalBrandMet + totalStudentMet) / totalPossible * 100) : 0

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">Dashboard</h1>
          <p className="admin-sub">Asset completion across all ventures and students.</p>
        </div>
      </div>

      {/* COUNT TILES */}
      <div className="dash-grid">
        <Link href={`${BASE}/students`} className="dash-tile">
          <div className="dash-tile-num">{students.length}</div>
          <div className="dash-tile-label">Students →</div>
        </Link>
        <Link href={`${BASE}/ventures`} className="dash-tile">
          <div className="dash-tile-num">{brands.length}</div>
          <div className="dash-tile-label">Ventures →</div>
        </Link>
        <Link href={`${BASE}/landing`} className="dash-tile">
          <div className="dash-tile-num">→</div>
          <div className="dash-tile-label">Landing media</div>
        </Link>
      </div>

      {/* OVERALL DONUT */}
      {brands.length > 0 && (
        <div className="admin-card" style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>
          <CompletionDonut pct={overallPct} />
          <div>
            <h2 className="admin-card-title" style={{ marginBottom: 4 }}>Overall completion</h2>
            <p className="admin-sub" style={{ marginBottom: 16 }}>
              5 media fields per venture · cert + email per student
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <StatRow label="ventures 100% complete" value={complete100} color="#22c55e" />
              <StatRow label="ventures partially filled" value={partial} color="#f59e0b" />
              <StatRow label="ventures with nothing uploaded" value={zero} color="#ef4444" />
            </div>
          </div>
        </div>
      )}

      {/* PER-VENTURE LIST — sorted worst first */}
      {ventures.length > 0 && (
        <div className="admin-card" style={{ marginTop: 24 }}>
          <h2 className="admin-card-title" style={{ marginBottom: 18 }}>Ventures — lowest completion first</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {ventures.map((v, idx) => (
              <div
                key={v.id}
                style={{
                  padding: '14px 0',
                  borderBottom: idx < ventures.length - 1 ? '0.5px solid rgba(15,25,25,0.07)' : 'none',
                }}
              >
                {/* Venture header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <Link
                        href={`${BASE}/ventures/${v.id}`}
                        style={{ fontWeight: 700, fontSize: 14, color: '#0F1919', textDecoration: 'none' }}
                      >
                        {v.name}
                      </Link>
                      <Pill pct={v.pct} />
                    </div>
                    {v.missing.length > 0 && (
                      <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3, fontWeight: 600 }}>
                        Missing: {v.missing.join(', ')}
                      </div>
                    )}
                    {v.missing.length === 0 && (
                      <div style={{ fontSize: 11, color: '#22c55e', marginTop: 3, fontWeight: 600 }}>
                        All media fields filled ✓
                      </div>
                    )}
                    {/* Students nested under venture */}
                    {v.students.length > 0 && (
                      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {v.students.map((s) => (
                          <div
                            key={s.id}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              paddingLeft: 12, borderLeft: '2px solid rgba(186,59,65,0.2)',
                            }}
                          >
                            <Link
                              href={`${BASE}/students/${s.id}`}
                              style={{ fontSize: 12, color: 'rgba(15,25,25,0.65)', textDecoration: 'none', fontWeight: 500 }}
                            >
                              {s.name}
                            </Link>
                            <span style={{ fontSize: 11, color: 'rgba(15,25,25,0.35)' }}>{s.pct}%</span>
                            {!s.hasCert && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: '#f59e0b22', padding: '1px 6px', borderRadius: 4 }}>
                                no cert
                              </span>
                            )}
                            {!s.email && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', background: '#ef444422', padding: '1px 6px', borderRadius: 4 }}>
                                no email
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
