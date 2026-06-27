import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isValidCohort } from '@/lib/cohorts'
import BrandForm from '../../../_components/BrandForm'

export const dynamic = 'force-dynamic'

type Params = { cohort: string }

export default async function NewVenturePage({ params }: { params: Promise<Params> }) {
  const { cohort } = await params
  if (!isValidCohort(cohort)) notFound()

  const BASE = `/${cohort}/admin-mesa-portfolio-6300`

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">New venture</h1>
          <p className="admin-sub"><Link href={`${BASE}/ventures`} style={{ color: 'var(--a-muted)' }}>← Back to ventures</Link></p>
        </div>
      </div>
      <BrandForm cohort={cohort} />
    </>
  )
}
