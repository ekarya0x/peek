<p align="center">
  <img src="https://raw.githubusercontent.com/ekarya0x/peek/master/docs/public/demo.gif" alt="peek demo" width="640" />
</p>

<h1 align="center">peek</h1>

<p align="center">
  <strong>Any agent, any branch, one command.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ekarya0x/cli"><img src="https://img.shields.io/npm/v/@ekarya0x/cli?style=flat&colorA=0a0a0a&colorB=4f46e5" alt="npm" /></a>
  <a href="https://github.com/ekarya0x/peek/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-0a0a0a?style=flat&colorB=4f46e5" alt="license" /></a>
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> •
  <a href="#why">Why</a> •
  <a href="#workflow">Workflow</a> •
  <a href="#cli">CLI</a> •
  <a href="#tips">Tips</a>
</p>

---

## The Problem

Every AI review = context switch tax:

```bash
git stash && git checkout agent/feature-47 && npm run dev
# ...wait...
git checkout main && npm run dev && git stash pop
```

At 20 reviews/day, that's **40 minutes lost**.

## The Solution

```bash
peek start ui-review    # isolated worktree
peek save               # merge back
```

Zero restart. Zero checkout. **Instant switching.**

---

## Quickstart

```bash
# Install
npm i -D @ekarya0x/cli @ekarya0x/vite-plugin

# Configure (vite.config.ts)
import peek from '@ekarya0x/vite-plugin'
export default { plugins: [peek()] }

# Use
peek start my-feature   # create + switch
peek save               # merge + cleanup
peek discard            # abandon
```

Next.js:
```bash
npm i -D @ekarya0x/cli @ekarya0x/next-plugin
```

```ts
// next.config.ts
import withPeek from '@ekarya0x/next-plugin'
export default withPeek()({ /* config */ })
```

---

## Why

peek = git worktrees + hot reload.

```
/your-project           ← editor stays here
/tmp/peek/peek-ui       ← agent workspace 1
/tmp/peek/peek-api      ← agent workspace 2
```

`peek ui` → dev server serves `/tmp/peek/peek-ui` → browser reloads.
`peek .` → back to main. Instant.

---

## Workflow

```bash
peek start ui-review         # create worktree + switch
peek scope                   # copy context to clipboard
# ...agent works...
peek save                    # merge, cleanup
peek save --keep             # merge, keep worktree
peek discard                 # abandon
```

**Multiple agents:**

```bash
peek start auth-flow
peek start ui-polish
peek list                    # see all
peek auth-flow               # switch
peek .                       # main
```

---

## CLI

| Command | Description |
|---------|-------------|
| `peek <target>` | Switch to worktree |
| `peek .` | Back to main |
| `peek -` | Previous |
| `peek start <name>` | Create isolated session |
| `peek save` | Merge + cleanup |
| `peek discard` | Abandon + cleanup |
| `peek scope` | Copy context |
| `peek list` | List worktrees |
| `peek clean` | Remove /tmp/peek/* |

### Options

```bash
peek start feat --base develop   # branch from develop
peek save -m "feat: auth"        # custom commit
peek save --push                 # push after merge
peek discard --force             # skip confirm
peek --port 5173 feature         # custom port
```

---

## Tips

**Workspace install (monorepo):**
```bash
pnpm add -w @ekarya0x/cli
```

**CLI only (no plugin):**
```bash
npm i -D @ekarya0x/cli
peek switch /path/to/worktree   # direct path
```

**Existing worktree:**
```bash
peek switch /Users/me/worktrees/feature
peek .
```

---

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/__peek` | GET | Current state |
| `/__peek` | POST | Switch `{ path }` |

WebSocket at `ws://localhost:24789` for real-time events.

---

## Packages

| Package | |
|---------|--|
| [@ekarya0x/cli](https://npmjs.com/package/@ekarya0x/cli) | CLI |
| [@ekarya0x/vite-plugin](https://npmjs.com/package/@ekarya0x/vite-plugin) | Vite |
| [@ekarya0x/next-plugin](https://npmjs.com/package/@ekarya0x/next-plugin) | Next.js |
| [@ekarya0x/middleware](https://npmjs.com/package/@ekarya0x/middleware) | Core |
| [@ekarya0x/banner](https://npmjs.com/package/@ekarya0x/banner) | UI |

---

## Requirements

- Node 18+
- Git 2.20+
- Vite 4+ / Next.js 13+

---

## License

MIT
