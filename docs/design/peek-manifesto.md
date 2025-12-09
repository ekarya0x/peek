# Peek Manifesto

Guiding principles and constraints for every design and implementation choice.

## Why Peek Exists
- Context switching is the hidden tax: branch change → reinstall → restart dev server → reload browser → lose mental state.
- Git’s worktree capability removes most of this cost, but the native UX is hostile. Peek makes the model match how developers think: sessions, not branches.
- Success means switches feel like flipping a light switch (<100ms) with zero data loss.

## First Principles
- **Make Git invisible:** users think in sessions/contexts; Peek translates to Git under the hood.
- **Instant means <100ms:** pre-create or pre-warm; never block the switch path with heavy work.
- **Zero data loss:** never destructive by default; stash/undo log for discards; recoverable for 30 days.
- **Self-healing:** `peek doctor` is safe/idempotent, diagnoses everything, and fixes what it can.
- **Opinionated defaults, easy escape hatches:** precedence = CLI flags > env > `.peekrc` > defaults.
- **Composable with the ecosystem:** editors, dev servers, CI, shells; proper exit codes and `--json`.

## Session Model
- Vocabulary: Session (worktree), Start, Switch, Save, Discard, Main, Active Session.
- State machine: Created → Active/Inactive ↔ Active → Saved | Discarded.
- Invariants: `main` is immutable; discard never allowed on `main`; destructive ops require explicit confirmation or `-y`.

## Performance Targets
- Switch: <100ms (95th percentile).
- Start: <500ms when worktree is pre-created/warmed.
- Proxy (future): hot-swap routing without browser reload; injected client banner+HMR reconnect.

## Safety & Recovery
- Discard auto-stashes uncommitted work with metadata pointers; `peek recover` lists/applies/drops/prunes.
- Doctor checks: git version, orphaned worktrees/refs, stale locks, pending WAL entries, config validity, disk/ports, federation paths, state/metrics corruption.
- Error codes use `PEEK-XXX` with actionable “how to fix”; `--json` everywhere diagnostics are printed.

## Dependency Sharing
- Strategy per path: reflink (preferred), hardlink, symlink, copy, skip; driven by `.peekignore`.
- Detect lockfile divergence → fall back to copy/install; report skips/errors clearly.

## Dev Server & Proxy Expectations
- Detect frameworks (Next/Vite/Remix/Angular/Nuxt/Svelte/generic scripts); assign/persist ports; health-check and retry.
- Proxy responsibilities (when enabled): HTTP/WS/SSE forwarding, banner/client-script injection, HMR socket rewiring, HTTPS support.

## Federation
- Consistent branch mapping rules; safe link/unlink/unmount with clear codes for missing paths.
- Keep mounts/paths in state; doctor surfaces mismatches.

## Telemetry & Metrics
- Local-only JSONL; retention configurable; `peek metrics` computes switches, session outcomes, time saved (baseline configurable).
- Leaderboard is derived from save/discard outcomes per agent prefix.

## Documentation & Distribution
- Single source of truth from CLI command definitions → generate `docs/cli/*`, man pages, README command table.
- Architecture doc for flows; this manifesto for “why”; error catalog for `PEEK-XXX`.
- Support npm/brew/binaries; shell completions for bash/zsh/fish; `NO_COLOR` respected.

## Acceptance Criteria (done means)
- All commands implement `--json` and meaningful exit codes; destructive commands support `-y`.
- Switches are instantaneous; saves merge/push/clean in one go; discards are recoverable.
- Doctor is comprehensive and idempotent.
- Tests: unit + integration + chaos; snapshot for CLI output; performance budgets enforced.


