'use client'

import { PeekBanner } from '@peektree/banner/react'

export default function Page() {
  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">peek / next</p>
        <h1>Validate App Router with live worktrees</h1>
        <p className="lede">
          Linked to local packages via <code>link:</code>. Switch branches with <code>peek</code> and ensure the page
          follows instantly.
        </p>
        <div className="pill-row">
          <span className="pill">@peektree/next-plugin</span>
          <span className="pill">@peektree/banner</span>
        </div>
      </header>

      <section className="card">
        <h2>Checks</h2>
        <ul>
          <li>App renders on http://localhost:3000</li>
          <li>Banner updates when toggling <code>peek sw .</code> / <code>peek sw -</code></li>
          <li>Crash recovery: kill <code>peek s crash-test</code>, then <code>peek doctor</code></li>
          <li>Diff: <code>peek diff agent-1 agent-2 --stat</code> shows accurate counts</li>
        </ul>
      </section>

      <PeekBanner />
    </div>
  )
}

