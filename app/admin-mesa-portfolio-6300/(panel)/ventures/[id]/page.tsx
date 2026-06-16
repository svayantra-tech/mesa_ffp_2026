import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBrand } from '@/lib/admin-data'
import BrandForm from '../../../_components/BrandForm'

export const dynamic = 'force-dynamic'

const BASE = '/admin-mesa-portfolio-6300'

export default async function EditVenturePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const brand = await getBrand(id)
  if (!brand) notFound()

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">{brand.name}</h1>
          <p className="admin-sub"><Link href={`${BASE}/ventures`} style={{ color: 'var(--a-muted)' }}>← Ventures</Link></p>
        </div>
      </div>
      <BrandForm brand={brand} />
    </>
  )
}
