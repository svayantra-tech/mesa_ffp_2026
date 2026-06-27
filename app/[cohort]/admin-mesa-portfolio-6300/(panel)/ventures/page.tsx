import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isValidCohort } from '@/lib/cohorts'
import { listBrands } from '@/lib/db/queries'
import VenturesList from '../../_components/VenturesList'

export const dynamic = 'force-dynamic'

type Params = { cohort: string }

export default async function VenturesPage({ params }: { params: Promise<Params> }) {
  const { cohort } = await params
  if (!isValidCohort(cohort)) notFound()

  const BASE = `/${cohort}/admin-mesa-portfolio-6300`
  const brands = await listBrands(cohort)

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">Ventures</h1>
          <p className="admin-sub">{brands.length} ventures</p>
        </div>
        <Link href={`${BASE}/ventures/new`} className="admin-btn admin-btn-primary">+ New venture</Link>
      </div>
      <VenturesList cohort={cohort} brands={brands} />
    </>
  )
}
