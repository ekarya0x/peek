<p align="center">
  <img src="https://github.com/ekarya0x/peek/raw/master/docs/site/public/demo.gif" alt="peek" width="640" />
</p>

<h1 align="center">peek</h1>

<p align="center">
<a href="https://www.npmjs.com/package/@peektree/cli"><img src="https://img.shields.io/npm/v/@peektree/cli?style=flat&colorA=0a0a0a&colorB=4f46e5" alt="npm" /></a>
  <a href="https://github.com/ekarya0x/peek/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-0a0a0a?style=flat&colorB=4f46e5" alt="license" /></a>
</p>

<p align="center">
Switch branches without restarting your dev server.
</p>

---

## The Problem

```bash
# Every branch switch costs 60+ seconds
git stash
git checkout feature-branch
npm install  # maybe
npm run dev  # wait for cold start...
```

With AI agents writing code across multiple branches, you do this 10+ times per day.

## The Solution

```bash
peek s feature     # new worktree, server hot-swaps
# ... work ...
peek save          # merge to main, cleanup
```

Switch takes **87ms**. No stash. No restart. Browser hot-reloads.

---

## Install

```bash
npm i -D @peektree/cli @peektree/vite-plugin
```

```ts
// vite.config.ts
import peek from '@peektree/vite-plugin'
export default { plugins: [peek()] }
```

For Next.js:
```bash
npm i -D @peektree/cli @peektree/next-plugin
```

```ts
// next.config.ts
import withPeek from '@peektree/next-plugin'
export default withPeek()({})
```

---

## Quick Start

```bash
peek s my-feature     # create worktree, switch to it
# browser now shows my-feature code

peek .                # back to main
peek -                # toggle (like cd -)

peek save             # merge to main, remove worktree
peek discard          # abandon worktree
```

---

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
| `peek lb` | Agent leaderboard |
| `peek diff a b` | Compare branches |
| `peek doctor` | Diagnose + fix |
| `peek recover` | Restore discarded work |
| `peek init` | Setup project |

[Full command reference →](docs/cli/commands.md) • [Workflows →](docs/cli/workflows.md) • [Error codes →](docs/cli/errors.md)

---

## How It Works

Peek uses git worktrees. Each branch gets its own folder:

```
/project              ← main
/tmp/peek/auth-fix    ← worktree
/tmp/peek/ui-update   ← worktree
```

When you switch, the dev server points to a different folder. Same server, different code.

[Architecture details →](docs/architecture.md) • [Peek Manifesto →](docs/design/peek-manifesto.md)

---

## Browser Overlay

When active, Peek shows an unobtrusive status bar in your app:

- **Branch name**: Current worktree at a glance
- **Back**: Return to main with one click
- **Copy Scope**: Grab project context for AI agents
- **Status**: HMR errors and switch confirmations

The overlay is provided by `@peektree/banner` and included automatically with the Vite and Next plugins. Customize or eject if needed.

---

## Config

```bash
PEEK_PORT=3000
PEEK_WORKTREE_DIR=/tmp/peek
```

Or `~/.config/peek/config.json`:
```json
{ "port": 3000, "worktreeDir": "/tmp/peek" }
```

Templates live in `templates/`:
- `.peekrc.json` sample: layered config defaults
- `.peekignore` sample: sharing strategies per path

---

## Troubleshooting

```bash
peek doctor           # check
peek doctor --fix     # fix
```

| Code | Problem | Fix |
|------|---------|-----|
| PEEK-001 | Git too old | Upgrade git |
| PEEK-003 | Orphaned worktree | `peek doctor --fix` |
| PEEK-010 | Lock held | Wait or `--fix` |

---

## Contributing

See [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)

---

## License

MIT
