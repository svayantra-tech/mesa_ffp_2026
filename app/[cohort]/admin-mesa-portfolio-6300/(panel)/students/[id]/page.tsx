import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isValidCohort } from '@/lib/cohorts'
import { getStudent, listBrands } from '@/lib/db/queries'
import StudentForm from '../../../_components/StudentForm'

export const dynamic = 'force-dynamic'

type Params = { cohort: string; id: string }

export default async function EditStudentPage({ params }: { params: Promise<Params> }) {
  const { cohort, id } = await params
  if (!isValidCohort(cohort)) notFound()

  const BASE = `/${cohort}/admin-mesa-portfolio-6300`
  const [student, brands] = await Promise.all([getStudent(cohort, id), listBrands(cohort)])
  if (!student) notFound()

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">{student.name}</h1>
          <p className="admin-sub">
            <Link href={`${BASE}/students`} style={{ color: 'var(--a-muted)' }}>← Students</Link>
            {' · '}
            <a href={`/${cohort}/${student.slug}`} target="_blank" rel="noreferrer" style={{ color: 'var(--a-accent-2)' }}>
              View public page ↗
            </a>
          </p>
        </div>
      </div>
      <StudentForm cohort={cohort} student={student} brands={brands.map((b) => ({ id: b.id, name: b.name }))} />
    </>
  )
}
