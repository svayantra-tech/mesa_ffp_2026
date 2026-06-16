import Link from 'next/link'
import { listStudents, listBrands } from '@/lib/admin-data'

export const dynamic = 'force-dynamic'

const BASE = '/admin-mesa-portfolio-6300'

export default async function DashboardPage() {
  const [students, brands] = await Promise.all([listStudents(), listBrands()])

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
