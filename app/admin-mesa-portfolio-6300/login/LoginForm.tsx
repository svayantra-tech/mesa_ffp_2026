'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Login failed')
      router.replace('/admin-mesa-portfolio-6300')
      router.refresh()
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Login failed')
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1 className="login-title">Mesa <span style={{ color: 'var(--a-accent)' }}>FFP</span> Admin</h1>
        <p className="login-sub">Restricted access. Authorised staff only.</p>
        <div className="admin-field">
          <label className="admin-label">Username</label>
          <input
            className="admin-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </div>
        <div className="admin-field">
          <label className="admin-label">Password</label>
          <input
            className="admin-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <p className="admin-toast err" style={{ marginBottom: 12 }}>{error}</p>}
        <button type="submit" className="admin-btn admin-btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
          {busy ? <span className="admin-spinner" /> : null}
          Sign in
        </button>
      </form>
    </div>
  )
}
