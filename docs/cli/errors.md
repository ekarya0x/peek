# Peek Error Codes

Peek emits structured error codes (`PEEK-XXX`) with human-readable messages and actionable fixes.

## Error Reference

| Code | Category | Meaning | Fix |
|------|----------|---------|-----|
| **PEEK-001** | Config | Git version too old | Upgrade git to 2.20+ |
| **PEEK-002** | Config | Invalid `.peekrc` syntax | Check JSON syntax |
| **PEEK-003** | State | Orphaned worktree (directory missing) | `peek doctor --fix` |
| **PEEK-004** | State | Locked worktree | `git worktree unlock <path>` |
| **PEEK-005** | State | Stale worktree references | `git worktree prune` |
| **PEEK-006** | Git | Worktree creation failed | Check permissions and disk space |
| **PEEK-007** | Git | Branch checkout failed | Ensure ref exists: `git fetch` |
| **PEEK-008** | Git | Merge conflict | Resolve conflicts, then `peek save --continue` |
| **PEEK-010** | Lock | Lock held by another process | Wait or `peek doctor --fix` |
| **PEEK-011** | Lock | Stale lock from dead process | `peek doctor --fix` |
| **PEEK-020** | State | Pending transaction in WAL | `peek doctor --fix` |
| **PEEK-030** | State | Missing worktree directory | Re-run `peek s <name>` |
| **PEEK-031** | Config | Invalid global config | `rm ~/.config/peek/config.json` |
| **PEEK-040** | System | Critically low disk space (<5%) | `peek clean` or free space |
| **PEEK-041** | System | Low disk space (<10%) | `peek clean` |
| **PEEK-050** | Federation | Federated project path missing | `peek fed unlink <name>` |

## Error Format

All errors follow this structure:

```
❌ [PEEK-XXX] Short description

What happened:
  Detailed explanation in plain English.

How to fix:
  Specific actionable steps.
  Or: Run `peek doctor --fix` to attempt automatic repair.
```

## Machine-Readable Output

All commands support `--json` for CI/CD integration:

```bash
peek doctor --json
```

```json
{
  "ok": false,
  "errors": [
    {
      "code": "PEEK-003",
      "level": "error",
      "message": "Orphaned worktree: old-feature",
      "fix": "git worktree prune",
      "autoFixable": true
    }
  ],
  "warnings": [],
  "checks": [...]
}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General failure |
| 2 | User error (bad input) |
| 3 | Conflict requiring manual intervention |

## Self-Healing

Most issues are auto-fixable:

```bash
peek doctor --fix
```

The doctor command:
- Prunes orphaned worktrees
- Releases stale locks
- Recovers pending transactions
- Creates missing directories
- Reports what it can't fix

## Best Practices

1. **Run doctor regularly**: `peek doctor` after unexpected crashes
2. **Use `-y` in CI**: Skip confirmation prompts with destructive commands
3. **Check JSON output**: Parse `--json` for programmatic error handling
4. **Report unknown errors**: If you see an unlisted code, file an issue
