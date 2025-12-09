# @peektree/middleware

Core engine for Peek — worktree management, state, and HMR coordination.

## Install

```bash
npm install @peektree/middleware
```

## Usage

```typescript
import { PeekCore } from '@peektree/middleware'

const core = new PeekCore({ mainPath: process.cwd() })

// Create worktree
const info = core.create({ branch: 'feature-auth' })

// Switch active worktree
core.switch({ to: info.path })

// Get current state
const state = core.getState()
// { active: '/tmp/peek/feature-auth', main: '/project' }

// List worktrees
const worktrees = core.list()

// Listen to switches
core.on('switch', ({ from, to, info }) => {
  console.log(`Switched from ${from} to ${to}`)
})
```

## Features

- **Worktree lifecycle**: create, switch, remove
- **Dependency sharing**: symlink, hardlink, reflink, copy strategies
- **Lockfile divergence detection**: prevents corrupted node_modules
- **Stash management**: auto-stash on discard, recover later
- **Metrics collection**: session duration, save rates
- **Lock coordination**: prevents concurrent operations

## Configuration

Uses `.peekrc.json` and `.peekignore` from project root.

```json
// .peekrc.json
{
  "port": 3000,
  "worktreeDir": "/tmp/peek",
  "branchPrefix": "agent"
}
```

```
# .peekignore
node_modules symlink
.next skip
dist skip
```

## License

MIT

