# @peektree/cli

The command-line interface for Peek — instant branch switching without restarting your dev server.

## Install

```bash
npm install -D @peektree/cli
```

## Quick Start

```bash
peek s my-feature     # create session
# browser shows my-feature code

peek .                # back to main
peek -                # toggle (like cd -)

peek save             # merge to main
peek discard          # abandon
```

## Commands

| Command | Description |
|---------|-------------|
| `peek s <name>` | Start new session |
| `peek save` | Merge + cleanup |
| `peek discard` | Abandon session |
| `peek sw <target>` | Switch worktree |
| `peek .` | Back to main |
| `peek -` | Previous (toggle) |
| `peek ls` | List worktrees |
| `peek recover` | Restore discarded work |
| `peek doctor` | Diagnose + fix |

## Recovery

Changes are never lost. When you discard a session with uncommitted work:

```bash
peek discard -f auth-fix
# ⚠️ Changes stashed to .peek/stash/auth-fix.patch

peek recover
# Lists all recoverable stashes

peek recover --apply stash-xxx
# ✓ Restored 3 files, 127 lines
```

## Configuration

```bash
PEEK_PORT=3000
PEEK_WORKTREE_DIR=/tmp/peek
```

Or `~/.config/peek/config.json`:
```json
{ "port": 3000, "worktreeDir": "/tmp/peek" }
```

## Requires

- Git 2.20+
- Node 18+

## Links

- [Full command reference](https://github.com/ekarya0x/peek/blob/master/docs/cli/commands.md)
- [Workflows](https://github.com/ekarya0x/peek/blob/master/docs/cli/workflows.md)
- [Error codes](https://github.com/ekarya0x/peek/blob/master/docs/cli/errors.md)

## License

MIT

