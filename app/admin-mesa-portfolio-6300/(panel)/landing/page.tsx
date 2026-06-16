import { listProgramMedia } from '@/lib/admin-data'
import LandingForm from '../../_components/LandingForm'

export const dynamic = 'force-dynamic'

export default async function LandingPage() {
  const media = await listProgramMedia()

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">Landing Page</h1>
          <p className="admin-sub">Homepage Demo Day video and flea-market &amp; demo photos.</p>
        </div>
        <a href="/" target="_blank" rel="noreferrer" className="admin-btn admin-btn-sm">View landing ↗</a>
      </div>

      <LandingForm media={media} />
    </>
  )
}
