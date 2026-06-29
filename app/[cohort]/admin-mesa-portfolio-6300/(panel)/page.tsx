import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isValidCohort, getCohort } from '@/lib/cohorts'
import { getCohortEnabled } from '@/lib/cohort-visibility'
import { listStudents, listBrands } from '@/lib/db/queries'
import CompletionDonut from '@/app/admin-mesa-portfolio-6300/_components/CompletionDonut'
import CohortVisibilityToggle from '@/app/admin-mesa-portfolio-6300/_components/CohortVisibilityToggle'

export const dynamic = 'force-dynamic'

type Params = { cohort: string }

const FIELD_LABELS: Record<string, string> = {
  videos: 'videos',
  ad_statics: 'ad statics',
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

export default async function DashboardPage({ params }: { params: Promise<Params> }) {
  const { cohort } = await params
  if (!isValidCohort(cohort)) notFound()

  const BASE = `/${cohort}/admin-mesa-portfolio-6300`
  const cohortMeta = getCohort(cohort)
  const [students, brands, cohortEnabled] = await Promise.all([
    listStudents(cohort),
    listBrands(cohort),
    getCohortEnabled(cohort),
  ])

  const brandStats = Object.fromEntries(brands.map((b) => {
    const fields: Record<string, boolean> = {
      videos: b.videos.length > 0,
      ad_statics: b.ad_statics.length > 0,
    }
    const metCount = Object.values(fields).filter(Boolean).length
    const missing = Object.entries(fields).filter(([, v]) => !v).map(([k]) => FIELD_LABELS[k])
    return [b.id, { metCount, pct: Math.round(metCount / 2 * 100), missing }]
  }))

  const studentsByBrand: Record<string, typeof students> = {}
  for (const s of students) {
    const key = s.brand_id ?? '__none__'
    ;(studentsByBrand[key] ??= []).push(s)
  }

  const ventures = brands.map((b) => {
    const stats = brandStats[b.id]
    const brandStudents = studentsByBrand[b.id] ?? []
    return {
      id: b.id,
      name: b.name,
      pct: stats.pct,
      missing: stats.missing,
      students: brandStudents.map((s) => {
        const photosUploaded = (s.certificate_url ? 1 : 0) + (s.convocation_photo ? 1 : 0) + (s.flea_market_photo ? 1 : 0) + (s.demo_day_photo ? 1 : 0)
        return {
          id: s.id,
          name: s.name,
          email: s.email,
          hasCert: !!s.certificate_url,
          hasConvoc: !!s.convocation_photo,
          hasFlea: !!s.flea_market_photo,
          hasDemo: !!s.demo_day_photo,
          photosUploaded,
          pct: Math.round(photosUploaded / 4 * 100),
        }
      }),
    }
  }).sort((a, b) => a.pct - b.pct)

  const complete100 = brands.filter((b) => brandStats[b.id].metCount === 2).length
  const zero = brands.filter((b) => brandStats[b.id].metCount === 0).length
  const partial = brands.length - complete100 - zero

  const totalBrandMet = brands.reduce((acc, b) => acc + brandStats[b.id].metCount, 0)
  const totalStudentMet = students.reduce((acc, s) => acc + (s.certificate_url ? 1 : 0) + (s.convocation_photo ? 1 : 0) + (s.flea_market_photo ? 1 : 0) + (s.demo_day_photo ? 1 : 0), 0)
  const totalPossible = brands.length * 2 + students.length * 4
  const overallPct = totalPossible > 0 ? Math.round((totalBrandMet + totalStudentMet) / totalPossible * 100) : 0

  return (
    <>
      <div className="admin-card" style={{ marginBottom: 24, borderLeft: '3px solid', borderColor: cohortEnabled ? '#22c55e' : '#ef4444' }}>
        <h2 className="admin-card-title" style={{ marginBottom: 12 }}>Cohort Visibility</h2>
        <CohortVisibilityToggle
          cohort={cohort}
          cohortName={cohortMeta?.name ?? cohort}
          initialEnabled={cohortEnabled}
        />
      </div>

      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">Dashboard</h1>
          <p className="admin-sub">Asset completion across all ventures and students.</p>
        </div>
      </div>

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

      {brands.length > 0 && (
        <div className="admin-card" style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 48, flexWrap: 'wrap' }}>
          <CompletionDonut pct={overallPct} />
          <div>
            <h2 className="admin-card-title" style={{ marginBottom: 4 }}>Overall completion</h2>
            <p className="admin-sub" style={{ marginBottom: 16 }}>
              2 media fields per venture · 4 photos per student (cert, convocation, flea market, demo day)
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <StatRow label="ventures 100% complete" value={complete100} color="#22c55e" />
              <StatRow label="ventures partially filled" value={partial} color="#f59e0b" />
              <StatRow label="ventures with nothing uploaded" value={zero} color="#ef4444" />
            </div>
          </div>
        </div>
      )}

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
                            <span style={{ fontSize: 11, color: 'rgba(15,25,25,0.35)' }}>{s.photosUploaded}/4</span>
                            {!s.hasCert && <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: '#f59e0b22', padding: '1px 6px', borderRadius: 4 }}>no cert</span>}
                            {!s.hasConvoc && <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: '#f59e0b22', padding: '1px 6px', borderRadius: 4 }}>no convoc</span>}
                            {!s.hasFlea && <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: '#f59e0b22', padding: '1px 6px', borderRadius: 4 }}>no flea</span>}
                            {!s.hasDemo && <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: '#f59e0b22', padding: '1px 6px', borderRadius: 4 }}>no demo</span>}
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

      {students.length === 0 && brands.length === 0 && (
        <div className="admin-card" style={{ marginTop: 24, textAlign: 'center', padding: '48px 24px' }}>
          <p className="admin-sub" style={{ marginBottom: 16 }}>This cohort is empty. Start by adding students and ventures.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link href={`${BASE}/students/new`} className="admin-btn admin-btn-primary">+ Add student</Link>
            <Link href={`${BASE}/ventures/new`} className="admin-btn admin-btn-primary">+ Add venture</Link>
          </div>
        </div>
      )}
    </>
  )
}
