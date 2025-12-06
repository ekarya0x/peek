<p align="center">
  <img src="https://github.com/ekarya0x/peek/raw/master/docs/public/demo.gif" alt="peek demo" width="640" />
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

Every time you ask an AI agent to code, you pay a "context switch tax."

```bash
git stash && git checkout agent/feature-47 && npm run dev
# ...wait for server...
# ...review changes...
git checkout main && npm run dev && git stash pop
```

At 20 reviews a day, you're losing hours just waiting for your dev server to restart. It breaks your flow and makes AI assistance feel like a chore.

## The Solution

**peek** eliminates the friction. It uses git worktrees and hot module replacement to let you review code instantly.

```bash
peek start ui-review    # creates isolated worktree & switches dev server
peek save               # merges to main & cleans up
```

Zero restart. Zero checkout. **Instant switching.**

Your main branch stays clean. Your dev server stays running. You stay in flow.

---

## Quickstart

### 1. Install

```bash
npm i -D @ekarya0x/cli @ekarya0x/vite-plugin
```

### 2. Configure

**Vite**
```ts
// vite.config.ts
import peek from '@ekarya0x/vite-plugin'
export default { plugins: [peek()] }
```

**Next.js**
```ts
// next.config.ts
import withPeek from '@ekarya0x/next-plugin'
export default withPeek()({ /* config */ })
```

### 3. Use

```bash
peek start my-feature   # create + switch
peek scope              # copy context for agent
peek save               # merge + cleanup
```

---

## Why

Under the hood, **peek** combines git worktrees with a smart middleware.

```
/your-project           ← editor stays here (main)
/tmp/peek/peek-ui       ← agent workspace 1
/tmp/peek/peek-api      ← agent workspace 2
```

When you run `peek ui`, we tell your running dev server to serve files from `/tmp/peek/peek-ui` instead of your current directory. The browser reloads instantly with the new content.

When you're done, `peek .` snaps you right back to main.

---

## Workflow

The ideal flow for AI-assisted development:

```bash
# 1. Create an isolated session
peek start ui-review

# 2. Give your agent the context it needs
peek scope              # copies file tree & key files to clipboard

# ... paste into Cursor/Claude/Aider ...
# ... agent writes code ...

# 3. Review live (browser updates automatically)

# 4. Merge perfect code
peek save               # squashes, merges to main, deletes worktree

# Or abandon bad ideas
peek discard            # wipes the worktree & branch
```

**Running multiple agents?** No problem.
```bash
peek start auth-flow
peek start ui-polish
peek list                    # see all active sessions
peek switch auth-flow        # check auth
peek switch ui-polish        # check ui
peek .                       # back to main
```

---

## CLI

| Command | Alias | Description |
|---------|-------|-------------|
| `peek [target]` | | Switch to a worktree (or `.` for main, `-` for last) |
| `peek start <name>` | `s` | Create a new isolated session |
| `peek save` | | Merge changes to main and cleanup |
| `peek discard` | | Abandon changes and cleanup |
| `peek scope [path]` | `ctx` | Copy project context for AI |
| `peek list` | `ls` | List active worktrees |
| `peek status` | `st` | Show current status |
| `peek create <br>` | `c` | Create a worktree (manual mode) |
| `peek remove <path>` | `rm` | Remove a worktree |
| `peek clean` | | Remove all temporary worktrees |
| `peek init` | | Initialize peek in a new project |

### Options

**start**
```bash
peek start feat --base develop   # branch from develop
peek start feat --at ./custom    # custom location
```

**save**
```bash
peek save -m "feat: auth"        # custom commit message
peek save --push                 # push after merge
peek save --keep                 # don't delete worktree
```

**discard**
```bash
peek discard --force             # skip confirmation
```

**scope**
```bash
peek scope --depth 2             # limit tree depth
peek scope --output              # print to stdout instead of clipboard
```

---

## Tips

**Monorepos:**
Install the CLI in the workspace root so it's available everywhere.
```bash
pnpm add -w @ekarya0x/cli
```

**Manual Mode (No Plugin):**
You can use the CLI just for worktree management without the dev server integration.
```bash
peek switch /path/to/worktree
```

**Existing Worktrees:**
Peek can switch to any git worktree, not just the ones in `/tmp/peek`.
```bash
peek switch ../my-other-branch
```

---

## API

**HTTP Endpoints**
Your dev server exposes these when the plugin is active:

- `GET  /__peek` — Current state + worktrees
- `POST /__peek` — Switch worktree `{ path: string }`
- `GET  /__peek/scope` — Get context payload

**WebSocket**
Connect to `ws://localhost:24789` (default) for real-time events.

```ts
const ws = new WebSocket('ws://localhost:24789')
ws.onmessage = (e) => {
  const { type, from, to } = JSON.parse(e.data)
  if (type === 'peek:switch') console.log(`Switched to ${to}`)
}
```

---

## License

MIT
