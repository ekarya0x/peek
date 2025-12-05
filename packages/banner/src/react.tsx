import { useEffect, useState, useCallback } from 'react'

interface PeekState {
  current: string
  main: string
  isMain: boolean
}

export function PeekBanner({ wsPort = 24789 }: { wsPort?: number }) {
  const [state, setState] = useState<PeekState>({ current: '', main: '', isMain: true })
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:${wsPort}`)

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'peek:state' || data.type === 'peek:switch') {
        const current = data.current || data.to
        const main = data.main
        setState({ current, main, isMain: current === main })
        setVisible(true)
      }
    }

    fetch('/__peek')
      .then(r => r.json())
      .then(data => {
        setState({ current: data.current, main: data.main, isMain: data.current === data.main })
        setVisible(true)
      })
      .catch(() => {})

    return () => ws.close()
  }, [wsPort])

  const goBack = useCallback(async () => {
    await fetch('/__peek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '.' })
    })
  }, [])

  const copyScope = useCallback(async () => {
    const res = await fetch('/__peek/scope')
    const text = await res.text()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [])

  if (!visible) return null

  const label = state.isMain ? 'main' : state.current.split('/').pop()

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 36,
        background: state.isMain ? '#0a0a0a' : '#0c1929',
        color: '#fafafa',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 99999,
        borderTop: `1px solid ${state.isMain ? '#262626' : '#1e3a5f'}`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: state.isMain ? '#22c55e' : '#3b82f6'
          }}
        />
        <span>{label}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {!state.isMain && (
          <button onClick={goBack} style={btnStyle}>
            Back
          </button>
        )}
        <button onClick={copyScope} style={btnStyle}>
          {copied ? 'Copied!' : 'Copy Scope'}
        </button>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid #404040',
  color: 'inherit',
  padding: '4px 12px',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 12
}

