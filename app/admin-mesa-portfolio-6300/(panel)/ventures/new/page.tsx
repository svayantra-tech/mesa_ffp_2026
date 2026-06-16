import Link from 'next/link'
import BrandForm from '../../../_components/BrandForm'

export const dynamic = 'force-dynamic'

const BASE = '/admin-mesa-portfolio-6300'

export default function NewVenturePage() {
  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">New venture</h1>
          <p className="admin-sub"><Link href={`${BASE}/ventures`} style={{ color: 'var(--a-muted)' }}>← Back to ventures</Link></p>
        </div>
      </div>
      <BrandForm />
    </>
  )
}
