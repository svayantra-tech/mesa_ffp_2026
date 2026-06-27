import { redirect } from 'next/navigation'
// Old admin panel — redirected to cohort-1 admin by middleware.
export default function OldDashboard() {
  redirect('/cohort-1/admin-mesa-portfolio-6300')
}
