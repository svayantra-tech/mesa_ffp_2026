import { redirect } from 'next/navigation'
export default async function OldEditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/cohort-1/admin-mesa-portfolio-6300/students/${id}`)
}
