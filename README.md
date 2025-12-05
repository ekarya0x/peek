# peek

Your dev server, any branch, one command.

```bash
peek agent/refactor     # view agent's work
peek .                   # back to main
```

No restart. No checkout. No context switch.

## Install

```bash
npm install -D @peek/vite-plugin
```

## Setup

```ts
// vite.config.ts
import peek from '@peek/vite-plugin'

export default {
  plugins: [peek()]
}
```

## CLI

```bash
peek <path>              # switch to worktree
peek .                   # back to main
peek --last              # previous worktree
peek list                # show all worktrees
peek create <branch>     # create and switch
peek remove <path>       # remove worktree
peek scope               # copy context for cursor
peek clean               # remove /tmp/peek/*
```

## Why

AI agents now write code faster than humans can review.

Every `git checkout && npm run dev` costs 2 minutes.

At 20 reviews/day, that's 40 minutes lost to context switching.

peek makes switching instant. Your dev server stays running.
You type a command. Browser updates. Done.

## API

```ts
peek({
  port: 24789,    // websocket port
  banner: true    // show ui banner
})
```

### Endpoints

- `GET /__peek` - current state
- `POST /__peek` - switch worktree
- `GET /__peek/scope` - context payload

## Packages

- `@peek/cli` - command line interface
- `@peek/middleware` - core logic
- `@peek/vite-plugin` - vite integration
- `@peek/banner` - ui component

## License

MIT

