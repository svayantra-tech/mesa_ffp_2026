'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminStudent } from '@/lib/admin-data'

const BASE = '/admin-mesa-portfolio-6300'

type Props = {
  student?: AdminStudent
  brands: { id: string; name: string }[]
}

export default function StudentForm({ student, brands }: Props) {
  const router = useRouter()
  const editing = !!student
  const [form, setForm] = useState({
    slug: student?.slug ?? '',
    name: student?.name ?? '',
    email: student?.email ?? '',
    certificate_url: student?.certificate_url ?? '',
    brand_id: student?.brand_id ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      const url = editing ? `/api/admin/students/${student!.id}` : '/api/admin/students'
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, brand_id: form.brand_id || null }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setMsg({ ok: true, text: 'Saved.' })
      if (!editing && data.id) {
        router.replace(`${BASE}/students/${data.id}`)
      }
      router.refresh()
    } catch (e2) {
      setMsg({ ok: false, text: e2 instanceof Error ? e2.message : 'Save failed' })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!editing || !confirm('Delete this student? This cannot be undone.')) return
    setBusy(true)
    const res = await fetch(`/api/admin/students/${student!.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.replace(`${BASE}/students`)
      router.refresh()
    } else {
      setMsg({ ok: false, text: 'Delete failed' })
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save}>
      <div className="admin-card">
        <h2 className="admin-card-title">Student details</h2>
        <div className="admin-row">
          <div className="admin-field">
            <label className="admin-label">Name</label>
            <input className="admin-input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="admin-field">
            <label className="admin-label">Slug (URL)</label>
            <input className="admin-input" value={form.slug} onChange={(e) => set('slug', e.target.value)} required />
          </div>
        </div>
        <div className="admin-field">
          <label className="admin-label">Email</label>
          <input className="admin-input" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Venture</label>
          <select className="admin-select" value={form.brand_id ?? ''} onChange={(e) => set('brand_id', e.target.value)}>
            <option value="">— No venture —</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="admin-field">
          <label className="admin-label">Certificate URL (Google Drive PDF)</label>
          <input
            className="admin-input"
            value={form.certificate_url}
            onChange={(e) => set('certificate_url', e.target.value)}
            placeholder="https://drive.google.com/file/d/.../view"
          />
          <p className="asset-hint">Certificates are PDFs hosted on Google Drive — paste the share link.</p>
        </div>
      </div>

      <div className="admin-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>
          {busy ? <span className="admin-spinner" /> : null}
          {editing ? 'Save changes' : 'Create student'}
        </button>
        {editing && (
          <button type="button" className="admin-btn admin-btn-danger" onClick={remove} disabled={busy}>
            Delete
          </button>
        )}
        {msg && <span className={`admin-toast ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</span>}
      </div>
    </form>
  )
}
