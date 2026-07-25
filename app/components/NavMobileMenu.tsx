'use client'

import { useEffect, useState } from 'react'

// Wraps the cohort switcher + primary nav links + primary action for every nav
// bar variant (landing, portfolio, directory). On desktop it's visually a no-op
// (CSS flattens it via display:contents so children stay inline flex items of
// <nav>, matching the pre-existing layout exactly). Below the 900px breakpoint
// it collapses behind a hamburger button into a dropdown panel — replacing the
// old approach of shrinking pills/buttons until they fit, which only ever fit
// iPhone-width screens and broke on narrower/wider Android devices.
export default function NavMobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  return (
    <div className="nav-menu">
      <button
        type="button"
        className={`nav-burger${open ? ' is-open' : ''}`}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span /><span /><span />
      </button>
      <div className={`nav-menu-panel${open ? ' open' : ''}`}>
        <div className="nav-menu-panel-inner" onClick={() => setOpen(false)}>
          {children}
        </div>
      </div>
    </div>
  )
}
