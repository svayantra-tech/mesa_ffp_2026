import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isValidCohort } from '@/lib/cohorts'
import { listStudents } from '@/lib/db/queries'
import StudentsList from '../../_components/StudentsList'

export const dynamic = 'force-dynamic'

type Params = { cohort: string }

export default async function StudentsPage({ params }: { params: Promise<Params> }) {
  const { cohort } = await params
  if (!isValidCohort(cohort)) notFound()

  const BASE = `/${cohort}/admin-mesa-portfolio-6300`
  const students = await listStudents(cohort)

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">Students</h1>
          <p className="admin-sub">{students.length} students</p>
        </div>
        <Link href={`${BASE}/students/new`} className="admin-btn admin-btn-primary">+ New student</Link>
      </div>
      <StudentsList cohort={cohort} students={students} />
    </>
  )
}
