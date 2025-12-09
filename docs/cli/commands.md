# Peek Command Reference

Complete CLI reference for peek.

## Session Commands

### `peek s <name>` / `peek start`
Start a new isolated session (creates worktree).

```bash
peek s feature-auth          # Create session from HEAD
peek s hotfix --base develop # Create from specific branch
peek s ui --at /fast/ssd     # Custom worktree location
```

**Options:**
- `--base <ref>` - Base branch/commit (default: HEAD)
- `--at <path>` - Custom worktree path
- `-p, --port <port>` - Dev server port (default: 3000)

### `peek save`
Merge session work to main and cleanup.

```bash
peek save                    # Merge and remove worktree
peek save --keep             # Merge but keep worktree
peek save -m "feat: auth"    # Commit uncommitted changes first
peek save --push             # Push after merge
```

### `peek discard` / `peek d`
Abandon session and remove worktree.

```bash
peek discard                 # Prompts for confirmation
peek discard -f              # Force, no confirmation
```

---

## Navigation Commands

### `peek sw <target>` / `peek switch`
Switch dev server to different worktree.

```bash
peek sw feature-auth         # By branch name
peek sw /tmp/peek/feature    # By path
peek .                       # Back to main
peek -                       # Toggle to previous (like cd -)
```

### `peek <target>` (default)
Shorthand for switch. If no target, shows status.

```bash
peek                         # Show status
peek auth-fix                # Switch to auth-fix
peek .                       # Main
peek -                       # Previous
```

---

## Inspection Commands

### `peek ls` / `peek list`
List all worktrees.

```bash
peek ls
```

Output:
```
  ● main
  ○ peek-auth-fix
  ○ peek-ui-update
```

### `peek st` / `peek status`
Show current peek status.

### `peek ctx [path]` / `peek scope`
Copy project context to clipboard (for AI agents).

```bash
peek ctx                     # Copy full structure
peek ctx src/                # Copy specific directory
peek ctx -o                  # Print to stdout instead
peek ctx --depth 2           # Limit directory depth
```

---

## Recovery Commands

### `peek recover`
Recover stashed changes from discarded sessions.

When you run `peek discard` on a worktree with uncommitted changes, those changes are automatically stashed and can be recovered later.

```bash
peek recover                 # List recoverable stashes
peek recover --apply <id>    # Apply stash to current worktree
peek recover --drop <id>     # Delete a stash permanently
peek recover --prune         # Remove stashes older than 7 days
peek recover --apply <id> --all  # Apply but keep stash
```

**Typical workflow:**
```bash
peek discard                 # Auto-stashes uncommitted changes
# ... later ...
peek recover                 # See available stashes
peek recover --apply stash-xxx  # Restore to current worktree
```

---

## Analytics Commands

### `peek lb` / `peek leaderboard`
Show agent leaderboard with save rates.

```bash
peek lb
```

Output:
```
  Agent           Commits  Lines   Saves  Rate
  -----------------------------------------------
● claude-auth          4    127       2   67%
  gpt-refactor         2     43       1   50%
```

### `peek diff <a> <b>` / `peek compare`
Compare two worktrees.

```bash
peek diff auth-fix ui-update      # Summary
peek diff auth-fix ui-update -s   # With diff stats
peek diff auth-fix ui-update -f   # List changed files
```

### `peek metrics`
Show performance metrics.

```bash
peek metrics                 # Summary
peek metrics -j              # JSON output
peek metrics -s              # Session history
peek metrics --export        # Export for sharing
```

---

## Management Commands

### `peek c <branch>` / `peek create`
Create worktree manually.

```bash
peek c experiment            # Create and switch
peek c exp --base develop    # From specific base
peek c exp --at /path        # Custom location
```

### `peek rm <path>` / `peek remove`
Remove worktree.

```bash
peek rm /tmp/peek/feature    # Remove specific worktree
peek rm feature -f           # Force remove
```

### `peek clean`
Remove all peek worktrees.

```bash
peek clean                   # Prompts for each
peek clean -f                # Force remove all
```

---

## Federation Commands

Multi-repo workspace management.

### `peek fed link <name> <path>`
Link external repository.

```bash
peek fed link backend ../backend
peek fed link api ../api -a backend  # With alias
```

### `peek fed mount <project> <branch>`
Mount branch from linked project.

```bash
peek fed mount backend feature/api
peek fed mount backend main --at /custom/path
```

### `peek fed sw <project> <branch>`
Switch branch in linked project.

```bash
peek fed sw backend main
peek fed sw backend feature/auth
```

### `peek fed ls`
List federated projects.

### `peek fed unlink <name>`
Unlink project from federation.

### `peek fed unmount <project> <path>`
Unmount federated worktree.

---

## Diagnostics

### `peek doctor`
Run diagnostics.

```bash
peek doctor                  # Check only
peek doctor --fix            # Auto-fix issues
peek doctor -v               # Verbose output
```

**Checks performed:**
- Git version compatibility
- Worktree health
- Lock state
- Pending transactions (crash recovery)
- Config validity
- Disk space
- Port availability
- Federation health

---

## Setup

### `peek init`
Initialize peek in current project.

Creates:
- `.peekrc.json` - Configuration template
- `.peekignore` - Sharing strategy rules

```bash
peek init
```

Detects Vite/Next.js and shows framework-specific setup instructions.

### `peek completion <shell>`
Generate shell completion script.

```bash
eval "$(peek completion zsh)"
eval "$(peek completion bash)"
peek completion fish > ~/.config/fish/completions/peek.fish
```

---

## Error Codes

| Code | Problem | Fix |
|------|---------|-----|
| PEEK-001 | Git too old (<2.20) | Upgrade git |
| PEEK-003 | Orphaned worktree | `peek doctor --fix` |
| PEEK-010 | Lock held | Wait or `peek doctor --fix` |
| PEEK-020 | Pending transaction | `peek doctor --fix` |
| PEEK-030 | Missing worktree dir | `mkdir -p /tmp/peek` |
| PEEK-040 | Low disk space | Free space or `peek clean` |
| PEEK-050 | Federation path missing | `peek fed unlink` or fix path |

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PEEK_PORT` | Dev server port | 3000 |
| `PEEK_WS_PORT` | WebSocket port | 24789 |
| `PEEK_WORKTREE_DIR` | Worktree base directory | /tmp/peek |
| `PEEK_BRANCH_PREFIX` | Branch naming prefix | agent |
| `PEEK_NATIVE` | Enable power-user features | 0 |
| `PEEK_AGENT` | Agent identifier for metadata | - |

---

## Configuration

Priority: CLI flags > `.peekrc.local` > `.peekrc.json` > `~/.config/peek/config.json` > env vars

```json
{
  "port": 3000,
  "wsPort": 24789,
  "worktreeDir": "/tmp/peek",
  "branchPrefix": "agent",
  "metrics": true,
  "federation": {
    "projects": {},
    "mountDir": "/tmp/peek/mounts"
  }
}
```

