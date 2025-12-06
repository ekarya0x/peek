<p align="center">
  <img src="https://github.com/ekarya0x/peek/raw/master/docs/public/demo.gif" alt="peek" width="640" />
</p>

<h1 align="center">peek</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@ekarya0x/cli"><img src="https://img.shields.io/npm/v/@ekarya0x/cli?style=flat&colorA=0a0a0a&colorB=4f46e5" alt="npm" /></a>
  <a href="https://github.com/ekarya0x/peek/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-0a0a0a?style=flat&colorB=4f46e5" alt="license" /></a>
</p>

---

## Problem

Context switches kill flow. Every `git stash && checkout && npm run dev` costs 30-60 seconds and fragments your attention.

With AI agents generating code across multiple branches, this compounds: 20 reviews/day × 60s = 20 minutes lost to waiting.

## Solution

```bash
peek s feature     # instant switch, no restart
peek save          # merge + cleanup
```

Peek uses git worktrees + HMR to serve multiple branches simultaneously. Switch is <100ms.

---

## Install

```bash
npm i -D @ekarya0x/cli @ekarya0x/vite-plugin  # or @ekarya0x/next-plugin
```

```ts
// vite.config.ts
import peek from '@ekarya0x/vite-plugin'
export default { plugins: [peek()] }
```

---

## Commands

```bash
peek s <name>         # start isolated session
peek save             # merge to main, cleanup
peek discard -f       # abandon session

peek sw <target>      # switch worktree
peek .                # back to main
peek -                # previous (toggle)

peek ls               # list worktrees
peek st               # status
peek ctx              # copy context for AI
peek diff a b         # compare two agents
peek lb               # leaderboard

peek doctor           # diagnose issues
peek doctor --fix     # auto-fix
```

### Aliases

| Full | Short |
|------|-------|
| `start` | `s` |
| `switch` | `sw` |
| `list` | `ls` |
| `status` | `st` |
| `scope` | `ctx` |
| `compare` | `diff` |
| `leaderboard` | `lb` |
| `create` | `c` |
| `remove` | `rm` |
| `discard` | `d` |
| `federation` | `fed` |

---

## Workflows

### AI Agent Review

```bash
peek s agent-claude
peek ctx | pbcopy     # copy context
# agent writes code, HMR shows changes
peek save             # or: peek d -f
```

### Agent Deathmatch

```bash
peek s agent-1 && peek ctx | pbcopy
peek s agent-2 && peek ctx | pbcopy
peek s agent-3 && peek ctx | pbcopy

peek lb               # see rankings
peek diff agent-1 agent-2
peek sw agent-1 && peek save
```

### Multi-Repo (Federation)

```bash
peek fed link backend ../backend
peek fed mount backend feature/auth
peek fed sw backend main
```

---

## Edge Cases Handled

| Scenario | What happens |
|----------|-------------|
| SIGKILL mid-switch | Transaction log recovers on next run |
| Disk full | Pre-check prevents partial worktree |
| Concurrent `peek s` | File lock serializes operations |
| Orphaned worktree | `peek doctor --fix` cleans up |
| Git <2.20 | Error with upgrade instructions |
| SSH key passphrase | Agent forwarding with timeout |

---

## Config

```bash
# Environment
PEEK_PORT=3000
PEEK_WS_PORT=24789
PEEK_WORKTREE_DIR=/tmp/peek

# File: ~/.config/peek/config.json or .peekrc.json
```

```json
{
  "port": 3000,
  "worktreeDir": "/tmp/peek",
  "branchPrefix": "peek"
}
```

---

## Shell Completion

```bash
eval "$(peek completion bash)"   # bash
eval "$(peek completion zsh)"    # zsh
peek completion fish > ~/.config/fish/completions/peek.fish
```

---

## API

```bash
curl localhost:3000/__peek           # GET state
curl -X POST localhost:3000/__peek   # switch
```

```ts
// WebSocket
const ws = new WebSocket('ws://localhost:24789')
ws.onmessage = (e) => {
  const { type, from, to } = JSON.parse(e.data)
}
```

---

## Troubleshooting

```bash
peek doctor              # check everything
peek doctor --fix        # fix common issues
peek clean               # remove all worktrees
```

| Code | Issue | Fix |
|------|-------|-----|
| PEEK-001 | Git too old | Upgrade git |
| PEEK-003 | Orphaned worktree | `peek doctor --fix` |
| PEEK-010 | Lock held | Wait or `--fix` |
| PEEK-020 | Crashed mid-op | `peek doctor --fix` |
| PEEK-040 | Low disk | `peek clean` |

---

MIT
