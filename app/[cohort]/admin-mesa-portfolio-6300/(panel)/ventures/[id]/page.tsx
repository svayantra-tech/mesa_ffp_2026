import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isValidCohort } from '@/lib/cohorts'
import { getBrand } from '@/lib/db/queries'
import BrandForm from '../../../_components/BrandForm'

export const dynamic = 'force-dynamic'

type Params = { cohort: string; id: string }

export default async function EditVenturePage({ params }: { params: Promise<Params> }) {
  const { cohort, id } = await params
  if (!isValidCohort(cohort)) notFound()

  const BASE = `/${cohort}/admin-mesa-portfolio-6300`
  const brand = await getBrand(cohort, id)
  if (!brand) notFound()

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">{brand.name}</h1>
          <p className="admin-sub"><Link href={`${BASE}/ventures`} style={{ color: 'var(--a-muted)' }}>← Ventures</Link></p>
        </div>
      </div>
      <BrandForm cohort={cohort} brand={brand} />
    </>
  )
}
