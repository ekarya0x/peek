<p align="center">
  <img src="https://github.com/user-attachments/assets/peek-logo.svg" alt="peek" height="80" />
</p>

<h1 align="center">peek</h1>

<p align="center">
  <strong>Any agent, any branch, one command.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ekarya0x/cli"><img src="https://img.shields.io/npm/v/@ekarya0x/cli?style=flat&colorA=0a0a0a&colorB=4f46e5" alt="npm version" /></a>
  <a href="https://github.com/ekarya0x/peek/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-0a0a0a?style=flat&colorB=4f46e5" alt="license" /></a>
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> •
  <a href="#why-peek">Why</a> •
  <a href="#agent-workflow">Agent Workflow</a> •
  <a href="#cli">CLI</a> •
  <a href="#frameworks">Frameworks</a> •
  <a href="#api">API</a>
</p>

---

## The Problem

AI agents write code faster than humans review it. But every review means:

```bash
git stash && git checkout agent/feature-47 && npm run dev
# ...2 minutes later...
git checkout main && npm run dev && git stash pop
```

**40 minutes/day lost** to context switching at 20 reviews/day.

## The Solution

```bash
peek start ui-review       # start isolated session
# ...agent works...
peek save                  # merge when done
```

No restart. No checkout. No context lost. **Zero downtime switching.**

---

## Quickstart

### 1. Install

```bash
npm install -D @ekarya0x/cli @ekarya0x/vite-plugin
# or
pnpm add -D @ekarya0x/cli @ekarya0x/vite-plugin
# or
yarn add -D @ekarya0x/cli @ekarya0x/vite-plugin
```

### 2. Configure

**Vite:**
```ts
// vite.config.ts
import peek from '@ekarya0x/vite-plugin'

export default {
  plugins: [peek()]
}
```

**Next.js:**
```ts
// next.config.ts
import withPeek from '@ekarya0x/next-plugin'

export default withPeek()({
  // your config
})
```

### 3. Use

```bash
peek start ui-review      # create worktree, switch to it
# ... agent does its work ...
peek save                 # merge work, cleanup
# or
peek discard              # abandon changes

# Already have a git worktree? Just switch—no setup needed:
peek switch /path/to/existing/worktree
peek .   # back to main
```

---

## Why peek?

peek uses **git worktrees** to maintain multiple branches simultaneously, combined with **hot module replacement** to switch your dev server's source directory instantly.

```
/your-project (main)          ← your editor stays here
/tmp/peek/peek-ui-review      ← isolated worktree
/tmp/peek/peek-api-metrics    ← another isolated worktree
```

When you run `peek ui-review`:
1. **Dev server** points to `/tmp/peek/peek-ui-review`
2. **Browser** reloads with agent's code
3. **Your editor** and main branch stay untouched

Switch back with `peek .` — instant.

---

## Agent Workflow

The recommended flow for working with AI agents:

```bash
# 1. Start a session for your agent
peek start ui-review

# 2. Give context to your agent
peek scope    # copies project structure to clipboard

# 3. Let the agent work in /tmp/peek/peek-ui-review
# ...agent makes changes...

# 4. Review in your browser (it's already showing the changes!)

# 5a. Happy with the work? Save it.
peek save                  # merges to main, cleans up
peek save --keep           # merges but keeps worktree
peek save --push           # also pushes to remote

# 5b. Not happy? Discard it.
peek discard               # removes worktree and branch
```

### Multiple Agents

Run multiple agents in parallel:

```bash
peek start ui-review       # /tmp/peek/peek-ui-review
peek start api-metrics     # /tmp/peek/peek-api-metrics  
peek start design-pass     # /tmp/peek/peek-design-pass

peek list                  # see all worktrees
peek ui-review             # switch to ui-review
peek api-metrics           # switch to api-metrics
peek .                     # back to main
```

---

## CLI

### Quick Reference

| Command | Description |
|---------|-------------|
| `peek <branch>` | Switch to worktree |
| `peek .` | Back to main |
| `peek -` | Previous worktree |
| `peek start <name>` | Create agent session |
| `peek save` | Merge and cleanup |
| `peek discard` | Abandon and cleanup |
| `peek scope` | Copy context for agents |
| `peek list` | Show all worktrees |
| `peek clean` | Remove all /tmp/peek/* |

### Commands in Detail

#### `peek start <name>`

Create a new isolated worktree and switch to it.

```bash
peek start ui-review           # creates peek-ui-review branch
peek start feature-auth        # creates peek-feature-auth branch
peek start --base develop fix  # branch from develop
```

#### `peek save`

Merge agent work back to main.

```bash
peek save                      # merge, remove worktree
peek save --keep               # merge, keep worktree
peek save -m "feat: new auth"  # custom commit message
peek save --push               # also push to remote
```

#### `peek discard`

Abandon agent work completely.

```bash
peek discard                   # prompts if uncommitted changes
peek discard --force           # skip confirmation
```

#### `peek scope`

Generate context for AI agents.

```bash
peek scope                     # copy to clipboard
peek scope --output            # print to stdout
peek scope --depth 6           # deeper file tree
```

---

## Frameworks

### Vite

```bash
npm install -D @ekarya0x/vite-plugin
```

```ts
// vite.config.ts
import peek from '@ekarya0x/vite-plugin'

export default {
  plugins: [peek({
    port: 24789,    // WebSocket port
    banner: true    // Show UI banner
  })]
}
```

### Next.js

```bash
npm install -D @ekarya0x/next-plugin
```

```ts
// next.config.ts
import withPeek from '@ekarya0x/next-plugin'

export default withPeek({
  port: 24789,
  banner: true
})({
  // your Next.js config
})
```

---

## API

### HTTP Endpoints

Your dev server exposes these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/__peek` | GET | Current state and worktree list |
| `/__peek` | POST | Switch worktree `{ path: string }` |
| `/__peek/scope` | GET | Get context payload |

### WebSocket

Connect to `ws://localhost:24789` for real-time updates:

```ts
const ws = new WebSocket('ws://localhost:24789')

ws.onmessage = (e) => {
  const data = JSON.parse(e.data)
  // { type: 'peek:switch', from: '...', to: '...', info: {...} }
}
```

---

## How It Works

1. **Git Worktrees**: Each agent gets an isolated working directory with its own branch
2. **Dev Server Middleware**: Intercepts requests and serves from the active worktree
3. **WebSocket Sync**: Real-time updates between CLI and browser
4. **HMR Integration**: Triggers full reload on worktree switch

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  peek CLI   │ ───▶ │  Dev Server  │ ───▶ │   Browser   │
│             │      │  (Vite/Next) │      │             │
└─────────────┘      └──────────────┘      └─────────────┘
      │                     │                     │
      │    WebSocket        │      HMR Reload     │
      └─────────────────────┴─────────────────────┘
```

---

## Packages

| Package | Description | Install |
|---------|-------------|---------|
| [`@ekarya0x/cli`](https://npmjs.com/package/@ekarya0x/cli) | Command line interface | `npm i -D @ekarya0x/cli` |
| [`@ekarya0x/vite-plugin`](https://npmjs.com/package/@ekarya0x/vite-plugin) | Vite integration | `npm i -D @ekarya0x/vite-plugin` |
| [`@ekarya0x/next-plugin`](https://npmjs.com/package/@ekarya0x/next-plugin) | Next.js integration | `npm i -D @ekarya0x/next-plugin` |
| [`@ekarya0x/middleware`](https://npmjs.com/package/@ekarya0x/middleware) | Core logic | `npm i @ekarya0x/middleware` |
| [`@ekarya0x/banner`](https://npmjs.com/package/@ekarya0x/banner) | UI component | `npm i @ekarya0x/banner` |

---

## Requirements

- Node.js 18+
- Git 2.20+ (for worktree support)
- Vite 4+ or Next.js 13+

---

## Contributing

```bash
git clone https://github.com/ekarya0x/peek
cd peek
pnpm install
pnpm build
pnpm test
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## License

MIT © [ekarya0x](https://github.com/ekarya0x)
