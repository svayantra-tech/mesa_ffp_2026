import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isValidCohort } from '@/lib/cohorts'
import { listBrands } from '@/lib/db/queries'
import StudentForm from '../../../_components/StudentForm'

export const dynamic = 'force-dynamic'

type Params = { cohort: string }

export default async function NewStudentPage({ params }: { params: Promise<Params> }) {
  const { cohort } = await params
  if (!isValidCohort(cohort)) notFound()

  const BASE = `/${cohort}/admin-mesa-portfolio-6300`
  const brands = await listBrands(cohort)

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">New student</h1>
          <p className="admin-sub"><Link href={`${BASE}/students`} style={{ color: 'var(--a-muted)' }}>← Back to students</Link></p>
        </div>
      </div>
      <StudentForm cohort={cohort} brands={brands.map((b) => ({ id: b.id, name: b.name }))} />
    </>
  )
}
