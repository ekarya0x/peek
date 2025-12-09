# Error Codes

Peek emits structured error codes (`PEEK-XXX`) with human-readable messages and suggested fixes.

| Code | Category | Meaning | Typical Fix |
|------|----------|---------|-------------|
| PEEK-001 | Config | Git too old / config invalid | Upgrade git or fix `.peekrc` |
| PEEK-003 | State | Orphaned worktree (dir missing) | `peek doctor --fix` or `git worktree prune` |
| PEEK-004 | State | Orphaned ref (ref missing dir) | `peek doctor --fix` |
| PEEK-005 | State | Stale worktree references | `git worktree prune` |
| PEEK-006 | Git | Worktree creation failed | Check permissions/path; rerun with `--at` |
| PEEK-007 | Git | Branch checkout failed | Ensure ref exists / fetch remote |
| PEEK-008 | Git | Merge conflict | Resolve conflicts, `peek save --continue` |
| PEEK-010 | Lock | Lock held / stale | Wait or `peek doctor --fix` |
| PEEK-020 | State | Pending transaction in WAL | `peek doctor --fix` |
| PEEK-030 | State | Missing worktree dir | Create dir or re-run start with valid path |
| PEEK-040 | System | Low disk space | Free space or `peek clean` |
| PEEK-050 | Federation | Federated path missing | Fix path or `peek fed unlink` |

Guidelines:
- All CLI commands should support `--json` to emit machine-readable diagnostics.
- Destructive commands honor `-y/--yes` for non-interactive scripts.
- Error output format: `❌ [PEEK-XXX] <short message>` followed by remediation text.
