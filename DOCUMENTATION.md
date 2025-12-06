# Peek Documentation

## Core Concept

Peek uses git worktrees to run multiple branches simultaneously. Switch time is <100ms because there's no checkout or server restart.

```
/project              ← main (editor stays here)
/tmp/peek/feature-1   ← worktree 1
/tmp/peek/feature-2   ← worktree 2
```

When you run `peek sw feature-1`, the dev server starts serving from that worktree. HMR reloads the browser.

---

## Installation

```bash
npm i -D @ekarya0x/cli @ekarya0x/vite-plugin
```

```ts
// vite.config.ts
import peek from '@ekarya0x/vite-plugin'
export default { plugins: [peek()] }
```

For Next.js:
```ts
import withPeek from '@ekarya0x/next-plugin'
export default withPeek()({ /* config */ })
```

---

## Commands

### Sessions

```bash
peek start <name>              # create worktree, switch
peek s <name> --base develop   # branch from develop
peek save                      # merge to main, cleanup
peek save -m "message"         # custom commit message
peek save --push               # push after merge
peek discard -f                # abandon session
```

### Navigation

```bash
peek sw <target>    # switch to worktree
peek .              # back to main
peek -              # previous (toggle)
```

### Inspection

```bash
peek ls             # list worktrees
peek st             # current status
peek ctx            # copy context for AI
peek ctx src/       # specific directory
peek ctx -o         # print instead of copy
```

### Comparison

```bash
peek diff a b         # diff two worktrees
peek diff a b --stat  # show stats
peek diff a b --files # list changed files
peek lb               # agent leaderboard
```

### Management

```bash
peek create <branch>  # create worktree
peek rm <path>        # remove worktree
peek clean            # remove all temp worktrees
peek doctor           # diagnose issues
peek doctor --fix     # auto-fix
```

### Federation

```bash
peek fed link backend ../backend   # link project
peek fed unlink backend            # unlink
peek fed ls                        # list linked
peek fed mount backend feature/x   # mount branch
peek fed sw backend main           # switch branch
peek fed scope backend             # copy context
```

---

## Configuration

Priority: CLI args > `.peekrc.local` > `.peekrc.json` > `~/.config/peek/config.json` > env vars

```json
{
  "port": 3000,
  "wsPort": 24789,
  "worktreeDir": "/tmp/peek",
  "branchPrefix": "peek",
  "metrics": true
}
```

Environment:
- `PEEK_PORT`
- `PEEK_WS_PORT`
- `PEEK_WORKTREE_DIR`
- `PEEK_BRANCH_PREFIX`

---

## API

### HTTP

```bash
GET  /__peek        # current state
POST /__peek        # switch worktree
GET  /__peek/scope  # context payload
```

### WebSocket

```ts
const ws = new WebSocket('ws://localhost:24789')
ws.onmessage = (e) => {
  const { type, from, to } = JSON.parse(e.data)
  if (type === 'peek:switch') {
    // switched
  }
}
```

---

## Error Codes

| Code | Issue | Fix |
|------|-------|-----|
| PEEK-001 | Git <2.20 | Upgrade git |
| PEEK-003 | Orphaned worktree | `peek doctor --fix` |
| PEEK-004 | Locked worktree | `git worktree unlock` |
| PEEK-010 | Lock held | Wait or `peek doctor --fix` |
| PEEK-020 | Pending transaction | `peek doctor --fix` |
| PEEK-030 | Missing worktree dir | `mkdir -p /tmp/peek` |
| PEEK-040 | Low disk | `peek clean` |
| PEEK-050 | Federation path missing | `peek fed unlink` |
| PEEK-060 | SSH agent dead | `ssh-add` |

---

## Shell Completion

```bash
eval "$(peek completion bash)"   # bash
eval "$(peek completion zsh)"    # zsh
peek completion fish > ~/.config/fish/completions/peek.fish
```

---

## Advanced

### Predictive Prefetch

Peek predicts your next switch and prefetches the worktree in background. 80% of switches are toggles between two worktrees.

### Guardrails

Worktrees get a pre-commit hook that warns if you try to commit to main/master from a worktree. Override with `PEEK_ALLOW_MAIN=1`.

### Metadata

Each worktree stores metadata in `.peek-meta.json`:
- `created` - timestamp
- `purpose` - inferred from branch name
- `parent` - base branch
- `agent` - if set via `PEEK_AGENT`

---

## Architecture

```
CLI → Middleware → Git Worktrees
         ↓
      Plugin → Dev Server → HMR → Browser
```

Packages:
- `@ekarya0x/cli` - CLI commands
- `@ekarya0x/middleware` - Core logic
- `@ekarya0x/vite-plugin` - Vite integration
- `@ekarya0x/next-plugin` - Next.js integration
- `@ekarya0x/banner` - UI overlay

---

MIT © ekarya0x
