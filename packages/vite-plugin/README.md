# @peektree/vite-plugin

Vite plugin for Peek — hot-swap branches without restarting your dev server.

## Install

```bash
npm install -D @peektree/cli @peektree/vite-plugin
```

## Setup

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import peek from '@peektree/vite-plugin'

export default defineConfig({
  plugins: [peek()]
})
```

## Options

```typescript
peek({
  port: 24789,   // WebSocket port (default: 24789)
  banner: true   // Show status overlay (default: true)
})
```

## How It Works

1. Plugin opens WebSocket on port 24789
2. When you run `peek sw feature-auth`, the dev server root changes
3. Browser receives HMR signal and hot-reloads
4. Status banner updates to show current branch

Switch takes ~87ms. No cold start. No stash.

## Browser Overlay

When active, Peek shows a status bar in your app:

- **Back**: Return to main
- **Copy Scope**: Grab context for AI
- **Status**: HMR errors, switch confirmations

## Links

- [CLI commands](https://github.com/ekarya0x/peek/blob/master/docs/cli/commands.md)
- [Workflows](https://github.com/ekarya0x/peek/blob/master/docs/cli/workflows.md)

## License

MIT

