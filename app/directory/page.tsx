// /directory is redirected to /cohort-1/directory by middleware.
// This page is a fallback; middleware handles it first.
import { redirect } from 'next/navigation'

export default function OldDirectoryPage() {
  redirect('/cohort-1/directory')
}
