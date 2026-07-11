'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminBrand } from '@/lib/db/queries'
import AssetListField from '@/app/admin-mesa-portfolio-6300/_components/AssetListField'
import VideoListField from '@/app/admin-mesa-portfolio-6300/_components/VideoListField'
import StringListField from '@/app/admin-mesa-portfolio-6300/_components/StringListField'

const empty: AdminBrand = {
  id: '',
  slug: '',
  name: '',
  description: '',
  revenue: 0,
  customers: 0,
  awards: [],
  award_descriptions: [],
  videos: [],
  ad_statics: [],
  website: '',
  instagram: '',
  feature_photo: '',
}

export default function BrandForm({ cohort, brand }: { cohort: string; brand?: AdminBrand }) {
  const BASE = `/${cohort}/admin-mesa-portfolio-6300`
  const router = useRouter()
  const editing = !!brand
  const [form, setForm] = useState<AdminBrand>(brand ?? empty)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function set<K extends keyof AdminBrand>(k: K, v: AdminBrand[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      const url = editing
        ? `/api/admin/brands/${brand!.id}?cohort=${cohort}`
        : `/api/admin/brands?cohort=${cohort}`
      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setMsg({ ok: true, text: 'Saved & published.' })
      if (!editing && data.id) router.replace(`${BASE}/ventures/${data.id}`)
      router.refresh()
    } catch (e2) {
      setMsg({ ok: false, text: e2 instanceof Error ? e2.message : 'Save failed' })
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!editing || !confirm('Delete this venture? This cannot be undone.')) return
    setBusy(true)
    const res = await fetch(`/api/admin/brands/${brand!.id}?cohort=${cohort}`, { method: 'DELETE' })
    if (res.ok) {
      router.replace(`${BASE}/ventures`)
      router.refresh()
    } else {
      setMsg({ ok: false, text: 'Delete failed' })
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save}>
      <div className="admin-card">
        <h2 className="admin-card-title">Venture details</h2>
        <div className="admin-row">
          <div className="admin-field">
            <label className="admin-label">Name</label>
            <input className="admin-input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>
          <div className="admin-field">
            <label className="admin-label">Slug</label>
            <input className="admin-input" value={form.slug} onChange={(e) => set('slug', e.target.value)} required />
          </div>
        </div>
        <div className="admin-field">
          <label className="admin-label">Description</label>
          <textarea className="admin-input" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </div>
        <div className="admin-row">
          <div className="admin-field">
            <label className="admin-label">Revenue (₹)</label>
            <input className="admin-input" type="number" value={form.revenue} onChange={(e) => set('revenue', Number(e.target.value))} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Customers</label>
            <input className="admin-input" type="number" value={form.customers} onChange={(e) => set('customers', Number(e.target.value))} />
          </div>
        </div>
        <div className="admin-row">
          <div className="admin-field">
            <label className="admin-label">Website</label>
            <input className="admin-input" value={form.website} onChange={(e) => set('website', e.target.value)} />
          </div>
          <div className="admin-field">
            <label className="admin-label">Instagram</label>
            <input className="admin-input" value={form.instagram} onChange={(e) => set('instagram', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">Awards</h2>
        <StringListField label="Award names" values={form.awards} onChange={(v) => set('awards', v)} />
        <StringListField label="Award descriptions" values={form.award_descriptions} onChange={(v) => set('award_descriptions', v)} />
      </div>

      <div className="admin-card">
        <h2 className="admin-card-title">Media</h2>
        <VideoListField label="YouTube videos" values={form.videos} onChange={(v) => set('videos', v)} />
        <AssetListField
          label="Ad statics"
          values={form.ad_statics}
          onChange={(v) => set('ad_statics', v)}
          allowPasteUrl
        />
        <AssetListField
          label="Feature photo (landing card)"
          values={form.feature_photo ? [form.feature_photo] : []}
          onChange={(v) => set('feature_photo', v[0] ?? '')}
          max={1}
          allowPasteUrl
        />
      </div>

      <div className="admin-actions">
        <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>
          {busy ? <span className="admin-spinner" /> : null}
          {editing ? 'Save changes' : 'Create venture'}
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
