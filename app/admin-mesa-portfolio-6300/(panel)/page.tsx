import Link from 'next/link'
import { listStudents, listBrands } from '@/lib/admin-data'

export const dynamic = 'force-dynamic'

const BASE = '/admin-mesa-portfolio-6300'

export default async function DashboardPage() {
  const [students, brands] = await Promise.all([listStudents(), listBrands()])

  const brandScores = brands.map((b) =>
    [!!b.product_photo, b.videos.length > 0, b.ad_statics.length > 0, b.flea_photos.length > 0, b.demo_photos.length > 0]
      .filter(Boolean).length
  )
  const total = brands.length || 1
  const complete = brandScores.filter((s) => s >= 4).length
  const partial = brandScores.filter((s) => s >= 2 && s < 4).length
  const flagged = brandScores.filter((s) => s < 2).length
  const greenDeg = Math.round((complete / total) * 360)
  const amberDeg = Math.round((partial / total) * 360)

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">Dashboard</h1>
          <p className="admin-sub">Manage everything that publishes to the public portfolio site.</p>
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
        <div className="admin-card" style={{ marginTop: 24 }}>
          <h2 className="admin-card-title">Content completion</h2>
          <p className="admin-sub" style={{ marginBottom: 16 }}>
            Tracks 5 media fields per venture: product photo, videos, ad statics, flea photos, demo photos.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%', flexShrink: 0,
              background: `conic-gradient(#22c55e 0deg ${greenDeg}deg, #f59e0b ${greenDeg}deg ${greenDeg + amberDeg}deg, #ef4444 ${greenDeg + amberDeg}deg 360deg)`,
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: '#22c55e', flexShrink: 0 }} />
                <span className="admin-sub" style={{ margin: 0 }}><strong>{complete}</strong> ventures complete (≥80%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: '#f59e0b', flexShrink: 0 }} />
                <span className="admin-sub" style={{ margin: 0 }}><strong>{partial}</strong> ventures partial (40–79%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: '#ef4444', flexShrink: 0 }} />
                <span className="admin-sub" style={{ margin: 0 }}><strong>{flagged}</strong> ventures need content (&lt;40%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="admin-card" style={{ marginTop: 24 }}>
        <h2 className="admin-card-title">How it works</h2>
        <p className="admin-sub" style={{ marginBottom: 8 }}>
          • <strong>Students</strong> — name, slug, email, certificate, and which venture they belong to.
        </p>
        <p className="admin-sub" style={{ marginBottom: 8 }}>
          • <strong>Ventures</strong> — brand details, revenue, awards, videos, and all marketing images
          (shared by a venture&apos;s founders).
        </p>
        <p className="admin-sub" style={{ marginBottom: 8 }}>
          • <strong>Landing Page</strong> — Demo Day video and the flea-market &amp; demo photos.
        </p>
        <p className="admin-sub">
          Every image field shows the <strong>present asset</strong> and lets you <strong>upload a new asset</strong>.
          Saving publishes to the live site immediately.
        </p>
      </div>
    </>
  )
}
