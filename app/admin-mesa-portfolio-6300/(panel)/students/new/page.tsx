import Link from 'next/link'
import { listBrands } from '@/lib/admin-data'
import StudentForm from '../../../_components/StudentForm'

export const dynamic = 'force-dynamic'

const BASE = '/admin-mesa-portfolio-6300'

export default async function NewStudentPage() {
  const brands = await listBrands()
  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1 className="admin-h1">New student</h1>
          <p className="admin-sub"><Link href={`${BASE}/students`} style={{ color: 'var(--a-muted)' }}>← Back to students</Link></p>
        </div>
      </div>
      <StudentForm brands={brands.map((b) => ({ id: b.id, name: b.name }))} />
    </>
  )
}
