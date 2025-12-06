# Peek v1.0 Summary

## Changes

**New Modules:**
- `errors.ts` - Structured errors with suggestions
- `predictor.ts` - Prefetch next likely worktree
- `guard.ts` - Prevent commits to wrong branch
- `metadata.ts` - Track worktree purpose/age
- `state.ts` - Write-ahead log for crash recovery
- `lock.ts` - File-based concurrency control
- `optimizer.ts` - Precache + hardlinks
- `validation.ts` - Config validation
- `federation-enhanced.ts` - SSH/LFS/submodules
- `git.ts` - Version checking

**New Commands:**
- `peek doctor [--fix]` - Diagnostics
- `peek completion <shell>` - Tab completion

**Tests:** 28 passing

## Aliases

| Command | Alias |
|---------|-------|
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

## Edge Cases

| Issue | Solution |
|-------|----------|
| SIGKILL mid-switch | Transaction log recovers |
| Concurrent CLI | File lock serializes |
| Orphaned worktree | `peek doctor --fix` |
| Disk full | Pre-check prevents corruption |
| Git too old | Error with upgrade path |

## Files

```
packages/middleware/src/
├── errors.ts          # Structured errors
├── predictor.ts       # Prefetch prediction
├── guard.ts           # Commit guardrails
├── metadata.ts        # Worktree metadata
├── state.ts           # Crash recovery
├── lock.ts            # Concurrency
├── optimizer.ts       # Performance
├── validation.ts      # Config validation
├── federation-enhanced.ts
└── git.ts

packages/cli/src/commands/
├── doctor.ts          # Diagnostics
└── completion.ts      # Shell completion
```

## Test

```bash
pnpm build && pnpm test
```
