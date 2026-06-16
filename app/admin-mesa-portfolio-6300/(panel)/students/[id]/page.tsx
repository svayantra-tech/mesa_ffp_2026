import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getStudent, listBrands } from '@/lib/admin-data'
import StudentForm from '../../../_components/StudentForm'

export const dynamic = 'force-dynamic'

const BASE = '/admin-mesa-portfolio-6300'

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [student, brands] = await Promise.all([getStudent(id), listBrands()])
  if (!student) notFound()

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">{student.name}</h1>
          <p className="admin-sub">
            <Link href={`${BASE}/students`} style={{ color: 'var(--a-muted)' }}>← Students</Link>
            {' · '}
            <a href={`/${student.slug}`} target="_blank" rel="noreferrer" style={{ color: 'var(--a-accent-2)' }}>
              View public page ↗
            </a>
          </p>
        </div>
      </div>
      <StudentForm student={student} brands={brands.map((b) => ({ id: b.id, name: b.name }))} />
    </>
  )
}
