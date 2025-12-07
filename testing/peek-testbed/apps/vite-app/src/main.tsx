import { createRoot } from 'react-dom/client'
import { PeekBanner } from '@peektree/banner/react'
import './style.css'

function App() {
  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">peek / vite</p>
        <h1>Instant branch switches</h1>
        <p className="lede">
          Linked to local packages via <code>link:</code>. Switch with <code>peek</code>, watch the UI reload, and grab
          screenshots for releases.
        </p>
        <div className="pill-row">
          <span className="pill">@peektree/vite-plugin</span>
          <span className="pill">@peektree/banner</span>
        </div>
      </header>

      <main className="grid">
        <section>
          <h2>Live reload check</h2>
          <ol>
            <li>Run <code>pnpm peek s experiment</code>.</li>
            <li>Update <code>src/main.tsx</code> in the <code>peek-experiment</code> worktree.</li>
            <li>Confirm this view hot-reloads under 100ms.</li>
          </ol>
        </section>

        <section>
          <h2>Toggle speed</h2>
          <p className="muted">`pnpm peek sw .` ↔ `pnpm peek sw -`</p>
          <p>Use the banner below to verify branch labels update instantly.</p>
        </section>

        <section>
          <h2>Save & discard</h2>
          <p className="muted">
            Commit in a worktree, run <code>pnpm peek save</code>, then confirm the banner jumps back to main and the
            worktree folder disappears.
          </p>
        </section>
      </main>

      <PeekBanner />
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)

