import { useState } from 'react'

export function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <h1>peek example</h1>
      <p>This example demonstrates the peek plugin.</p>
      <div className="card">
        <button onClick={() => setCount(c => c + 1)}>
          Count: {count}
        </button>
      </div>
      <p className="hint">
        Run <code>peek create test-branch</code> to try it out.
      </p>
    </div>
  )
}

