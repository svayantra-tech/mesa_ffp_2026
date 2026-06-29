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

  const isLive = enabled
  const statusColor = isLive ? '#22c55e' : '#ef4444'
  const statusBg = isLive ? '#22c55e18' : '#ef444418'
  const statusText = isLive ? 'LIVE' : 'HIDDEN'

  return (
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
  )
}
