import Link from 'next/link'
import { listStudents } from '@/lib/admin-data'
import StudentsList from '../../_components/StudentsList'

export const dynamic = 'force-dynamic'

const BASE = '/admin-mesa-portfolio-6300'

export default async function StudentsPage() {
  const students = await listStudents()
  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">Students</h1>
          <p className="admin-sub">{students.length} students</p>
        </div>
        <Link href={`${BASE}/students/new`} className="admin-btn admin-btn-primary">+ New student</Link>
      </div>
      <StudentsList students={students} />
    </>
  )
}
