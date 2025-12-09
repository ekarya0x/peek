# @peektree/next-plugin

Next.js plugin for Peek — hot-swap branches without restarting your dev server.

## Install

```bash
npm install -D @peektree/cli @peektree/next-plugin
```

## Setup

```typescript
// next.config.ts
import withPeek from '@peektree/next-plugin'

export default withPeek()({
  // your next config
})
```

## Options

```typescript
withPeek({
  port: 24789,   // WebSocket port (default: 24789)
  banner: true,  // Show status overlay (default: true)
  debug: false   // Log switch events (default: false)
})({
  // your next config
})
```

## How It Works

1. Plugin wraps Next.js middleware and webpack config
2. WebSocket server listens for switch commands
3. When you run `peek sw feature-auth`, the plugin triggers a full reload
4. Status banner updates to show current branch

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

