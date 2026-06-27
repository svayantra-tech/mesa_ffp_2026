'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function AdminNav({ cohort }: { cohort: string }) {
  const BASE = `/${cohort}/admin-mesa-portfolio-6300`
  const LINKS = [
    { href: BASE, label: 'Dashboard' },
    { href: `${BASE}/students`, label: 'Students' },
    { href: `${BASE}/ventures`, label: 'Ventures' },
    { href: `${BASE}/landing`, label: 'Landing Page' },
  ]

  const pathname = usePathname()
  const router = useRouter()

  function isActive(href: string) {
    if (href === BASE) return pathname === BASE
    return pathname.startsWith(href)
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace(`${BASE}/login`)
    router.refresh()
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">Mesa <span>FFP</span></div>
      <div className="admin-brand-sub">Portfolio Admin</div>
      <nav className="admin-nav">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={isActive(l.href) ? 'active' : ''}>
            {l.label}
          </Link>
        ))}
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          style={{ marginTop: 18, justifyContent: 'flex-start' }}
          onClick={logout}
        >
          Sign out
        </button>
      </nav>
    </aside>
  )
}
