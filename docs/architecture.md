# Peek Architecture

How peek achieves instant branch switching.

## Core Concept

Peek uses git worktrees to maintain multiple working directories simultaneously. When you switch branches, the dev server simply points to a different folder—no checkout, no dependency reinstall, no cold start.

```
/project              ← main (your normal repo)
/tmp/peek/auth-fix    ← worktree (separate folder, same git history)
/tmp/peek/ui-update   ← worktree
```

Each worktree is a full working copy that shares git objects with the main repo. This means:
- **No duplication** of git history
- **Instant creation** (just checkout, no clone)
- **Full isolation** between branches

---

## System Components

### 1. CLI (`@ekarya0x/cli`)

The command-line interface that orchestrates everything:

```
┌─────────────────────────────────────────┐
│                  CLI                     │
├─────────────────────────────────────────┤
│  Commands: s, sw, save, discard, doctor │
│  Lock manager (prevents race conditions) │
│  Transaction log (crash recovery)        │
│  Metrics collector                       │
└─────────────────────────────────────────┘
```

### 2. Middleware (`@ekarya0x/middleware`)

Core library with all the logic:

```
┌─────────────────────────────────────────┐
│              Middleware                  │
├─────────────────────────────────────────┤
│  PeekCore - state management             │
│  Worktree - git operations               │
│  State - WAL for crash recovery          │
│  Lock - distributed locking              │
│  Config - layered configuration          │
│  Metrics - performance tracking          │
│  Optimizer - prefetching & hardlinks     │
│  Predictor - next-switch prediction      │
│  Federation - multi-repo support         │
└─────────────────────────────────────────┘
```

### 3. Plugins (`@ekarya0x/vite-plugin`, `@ekarya0x/next-plugin`)

Framework integrations that enable hot-swapping:

```
┌─────────────────────────────────────────┐
│            Vite/Next Plugin              │
├─────────────────────────────────────────┤
│  HTTP endpoint: /__peek                  │
│  WebSocket server (port 24789)           │
│  HMR integration                         │
│  Root path switching                     │
└─────────────────────────────────────────┘
```

### 4. Banner (`@ekarya0x/banner`)

Visual indicator showing current worktree:

```
┌─────────────────────────────────────────┐
│              Banner UI                   │
├─────────────────────────────────────────┤
│  WebSocket client (receives updates)     │
│  Branch display                          │
│  Back button (return to main)            │
│  Copy Scope (for AI agents)              │
└─────────────────────────────────────────┘
```

---

## Switch Flow

When you run `peek sw feature`:

```
1. CLI receives command
   │
2. Acquire lock (prevent concurrent switches)
   │
3. Write transaction to WAL (crash recovery)
   │
4. Resolve target (branch name → worktree path)
   │
5. Update PeekCore state
   │
6. POST to dev server: /__peek { path: "/tmp/peek/feature" }
   │
7. Plugin updates its root path
   │
8. Plugin triggers HMR reload
   │
9. WebSocket broadcasts switch event
   │
10. Banner updates to show new branch
    │
11. Commit transaction in WAL
    │
12. Release lock
```

Total time: **< 100ms** (typically 50-90ms)

---

## Crash Recovery

Peek uses a Write-Ahead Log (WAL) pattern:

1. **Before** any operation, write intent to `~/.config/peek/wal.json`
2. **Execute** the operation
3. **After** success, mark transaction as committed

If peek crashes mid-operation:
- Next `peek` command detects pending transactions
- `peek doctor --fix` rolls back incomplete operations
- No corrupted state, no orphaned worktrees

---

## Lock Mechanism

Prevents race conditions when multiple terminals run peek:

```
~/.config/peek/.lock
{
  "pid": 12345,
  "timestamp": 1699123456789,
  "command": "switch",
  "hostname": "macbook"
}
```

- Atomic file creation (`wx` flag)
- Stale lock detection (checks if PID still running)
- 5-second timeout with retry
- Auto-cleanup on crash via `doctor --fix`

---

## Dependency Sharing

Worktrees share git objects but need their own `node_modules`. Peek optimizes this:

### Hardlinks (default on macOS/Linux)
```bash
cp -al /project/node_modules /tmp/peek/feature/node_modules
```
- Zero extra disk space
- Instant "copy"
- Files share physical storage

### Symlinks (fallback)
```bash
ln -s /project/node_modules /tmp/peek/feature/node_modules
```
- Works when hardlinks fail
- May cause issues with some bundlers

### .peekignore

Control per-directory strategy:

```
# Format: <pattern> <strategy>
# Strategies: symlink, hardlink, copy, skip

node_modules symlink    # Link to main (instant, zero space)
.next skip              # Don't copy (regenerated)
dist skip               # Don't copy (build output)
.turbo skip             # Cache, regenerated
coverage skip           # Test artifacts
```

Strategies explained:
- **symlink** - Create symbolic link to source (instant, shared)
- **hardlink** - Create hard links (same disk required, zero space)
- **copy** - Full copy (slow, takes space)
- **skip** - Don't include (fastest, for regenerable content)

---

## Predictive Prefetching

Peek learns your switch patterns:

```
You: peek sw main → peek sw feature → peek sw main → peek sw feature
Peek: "Toggle pattern detected, prefetching 'feature' when on 'main'"
```

When on `main`, peek warms the filesystem cache for `feature` in the background:
- Touch all tracked files (warms OS cache)
- Pre-resolve module paths
- Result: even faster switches

---

## Federation (Multi-repo)

Link related repositories for synchronized switching:

```
Frontend repo:  /code/frontend
Backend repo:   /code/backend

peek fed link backend ../backend
peek fed mount backend feature/api

Now:
  /code/frontend           ← main
  /tmp/peek/frontend-auth  ← frontend worktree
  /tmp/peek/backend-api    ← backend worktree (federated)
```

Switch frontend and backend branches together, or independently.

---

## WebSocket Protocol

Server → Client messages:

```json
// Initial state
{
  "type": "peek:state",
  "current": "/project",
  "main": "/project",
  "previous": null,
  "worktrees": [...]
}

// Switch notification
{
  "type": "peek:switch",
  "from": "/project",
  "to": "/tmp/peek/feature",
  "info": { "branch": "feature", "commit": "abc123" }
}
```

---

## HTTP API

### GET /__peek
Returns current state:
```json
{
  "current": "/tmp/peek/feature",
  "main": "/project",
  "previous": "/project",
  "worktrees": [
    { "path": "/project", "branch": "main", "isMain": true },
    { "path": "/tmp/peek/feature", "branch": "agent/feature", "isMain": false }
  ]
}
```

### POST /__peek
Switch worktree:
```json
{ "path": "/tmp/peek/other" }
```

### GET /__peek/scope
Returns project structure for AI agents (plain text).

---

## File Locations

| Path | Purpose |
|------|---------|
| `~/.config/peek/config.json` | Global configuration |
| `~/.config/peek/state.json` | Runtime state |
| `~/.config/peek/wal.json` | Transaction log |
| `~/.config/peek/metrics.json` | Performance data |
| `~/.config/peek/mounts.json` | Federation mounts |
| `~/.config/peek/.lock` | Process lock file |
| `/tmp/peek/` | Default worktree location |
| `.peekrc.json` | Project-local config |
| `.peek-meta.json` | Worktree metadata |

