import Link from 'next/link'
import { listBrands } from '@/lib/admin-data'
import VenturesList from '../../_components/VenturesList'

export const dynamic = 'force-dynamic'

const BASE = '/admin-mesa-portfolio-6300'

export default async function VenturesPage() {
  const brands = await listBrands()
  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">Ventures</h1>
          <p className="admin-sub">{brands.length} ventures</p>
        </div>
        <Link href={`${BASE}/ventures/new`} className="admin-btn admin-btn-primary">+ New venture</Link>
      </div>
      <VenturesList brands={brands} />
    </>
  )
}
