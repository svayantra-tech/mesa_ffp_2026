'use client'

import { useState } from 'react'

type Props = {
  label: string
  values: string[]
  onChange: (vals: string[]) => void
  placeholder?: string
}

// Editable list of plain strings (e.g. awards).
export default function StringListField({ label, values, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState('')

  function add() {
    const v = draft.trim()
    if (!v) return
    onChange([...values, v])
    setDraft('')
  }
  function remove(i: number) {
    onChange(values.filter((_, idx) => idx !== i))
  }

  return (
    <div className="admin-field">
      <label className="admin-label">
        {label} ({values.length})
      </label>
      {values.length > 0 && (
        <div className="chip-list">
          {values.map((v, i) => (
            <span key={`${v}-${i}`} className="chip">
              {v}
              <button type="button" onClick={() => remove(i)} title="Remove">×</button>
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="admin-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={placeholder || 'Add item and press Enter'}
        />
        <button type="button" className="admin-btn admin-btn-sm" onClick={add} disabled={!draft.trim()}>
          Add
        </button>
      </div>
    </div>
  )
}
