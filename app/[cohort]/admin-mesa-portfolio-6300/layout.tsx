import type { Metadata } from 'next'
import '@/app/admin-mesa-portfolio-6300/admin.css'

export const metadata: Metadata = {
  title: 'Admin · Mesa FFP',
  robots: { index: false, follow: false, nocache: true },
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root">{children}</div>
}
