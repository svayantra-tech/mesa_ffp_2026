'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell } from 'recharts'

export default function CompletionDonut({ pct }: { pct: number }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <div style={{ width: 200, height: 200, borderRadius: '50%', background: '#e8e0cc' }} />
  }

  const data = [
    { name: 'Filled', value: pct },
    { name: 'Empty', value: Math.max(0, 100 - pct) },
  ]

  return (
    <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
      <PieChart width={200} height={200}>
        <Pie
          data={data}
          cx={100}
          cy={100}
          innerRadius={68}
          outerRadius={90}
          dataKey="value"
          startAngle={90}
          endAngle={-270}
          strokeWidth={0}
        >
          <Cell fill="#BA3B41" />
          <Cell fill="#e8e0cc" />
        </Pie>
      </PieChart>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#0F1919', lineHeight: 1 }}>{pct}%</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(15,25,25,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>filled</div>
      </div>
    </div>
  )
}
