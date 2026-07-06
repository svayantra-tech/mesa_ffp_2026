'use client'

import { useState } from 'react'

type Props = {
  cohort: string
  cohortName: string
  initialEnabled: boolean
}

export default function CohortVisibilityToggle({ cohort, cohortName, initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [loading, setLoading] = useState(false)
  const [previewBusy, setPreviewBusy] = useState(false)
  const [previewMsg, setPreviewMsg] = useState('')

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/cohort-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohort, enabled: !enabled }),
      })
      const data = await res.json()
      if (res.ok) setEnabled(data.enabled)
    } finally {
      setLoading(false)
    }
  }

  async function copyPreviewLink(action: 'get' | 'reset') {
    if (action === 'reset' && !window.confirm('Reset the preview link? Any link shared earlier will stop working.')) {
      return
    }
    setPreviewBusy(true)
    setPreviewMsg('')
    try {
      const res = await fetch('/api/admin/preview-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohort, action }),
      })
      const data = await res.json()
      if (!res.ok) { setPreviewMsg('Failed — try again'); return }
      const url = `${window.location.origin}/${cohort}?preview=${data.token}`
      try {
        await navigator.clipboard.writeText(url)
        setPreviewMsg(action === 'reset' ? 'New link reset & copied ✓' : 'Preview link copied ✓')
      } catch {
        setPreviewMsg(url) // clipboard blocked — show it so it can be copied manually
      }
    } finally {
      setPreviewBusy(false)
    }
  }

  const isLive = enabled
  const statusColor = isLive ? '#22c55e' : '#ef4444'
  const statusBg = isLive ? '#22c55e18' : '#ef444418'
  const statusText = isLive ? 'LIVE' : 'HIDDEN'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, flexWrap: 'wrap',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 14px', borderRadius: 999, fontWeight: 800, fontSize: 13,
            background: statusBg, color: statusColor, letterSpacing: '.04em',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: statusColor,
              boxShadow: isLive ? `0 0 0 3px ${statusColor}44` : 'none',
              display: 'inline-block',
            }} />
            {cohortName} is {statusText}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(15,25,25,0.5)', margin: 0 }}>
          {isLive
            ? 'Visible to the public — routes, directory, and switcher are all active.'
            : 'Hidden from the public — all routes return 404. Admin access unaffected.'}
        </p>
      </div>
      <button
        onClick={toggle}
        disabled={loading}
        style={{
          padding: '8px 20px', borderRadius: 8, fontWeight: 700, fontSize: 13,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          border: isLive ? '1.5px solid #ef4444' : '1.5px solid #22c55e',
          background: isLive ? '#ef444412' : '#22c55e12',
          color: isLive ? '#ef4444' : '#22c55e',
          transition: 'opacity 0.15s',
          flexShrink: 0,
        }}
      >
        {loading ? 'Saving…' : isLive ? 'Take offline' : 'Publish'}
      </button>
    </div>

    {/* Preview link — share a still-hidden cohort for pre-launch review */}
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      paddingTop: 14, borderTop: '0.5px solid rgba(15,25,25,0.08)',
    }}>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0F1919', marginBottom: 2 }}>
          Preview link
        </div>
        <p style={{ fontSize: 11, color: 'rgba(15,25,25,0.5)', margin: 0 }}>
          Opens {cohortName} for anyone with the link, even while hidden — for pre-launch review.
          It stays 404 for the public and is not shown in the cohort switcher. Treat it as secret.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
        {previewMsg && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(15,25,25,0.6)', maxWidth: 260, wordBreak: 'break-all' }}>
            {previewMsg}
          </span>
        )}
        <button
          onClick={() => copyPreviewLink('get')}
          disabled={previewBusy}
          style={{
            padding: '7px 16px', borderRadius: 8, fontWeight: 700, fontSize: 12,
            cursor: previewBusy ? 'not-allowed' : 'pointer', opacity: previewBusy ? 0.6 : 1,
            border: '1.5px solid #0F1919', background: '#0F1919', color: '#fff', flexShrink: 0,
          }}
        >
          {previewBusy ? '…' : 'Copy preview link'}
        </button>
        <button
          onClick={() => copyPreviewLink('reset')}
          disabled={previewBusy}
          style={{
            padding: '7px 14px', borderRadius: 8, fontWeight: 700, fontSize: 12,
            cursor: previewBusy ? 'not-allowed' : 'pointer', opacity: previewBusy ? 0.6 : 1,
            border: '1.5px solid rgba(15,25,25,0.2)', background: 'transparent', color: 'rgba(15,25,25,0.6)', flexShrink: 0,
          }}
        >
          Reset link
        </button>
      </div>
    </div>
    </div>
  )
}
