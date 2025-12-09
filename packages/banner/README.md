# @peektree/banner

Status overlay component for Peek — visual feedback during development.

## What It Does

Renders an unobtrusive status bar in your browser showing:

- Current worktree/branch name
- **Back** button to return to main
- **Copy Scope** button to grab context for AI
- HMR status and switch confirmations

## Install

Usually installed as a dependency of `@peektree/vite-plugin` or `@peektree/next-plugin`.

```bash
npm install @peektree/banner
```

## Usage

### Vanilla JS

```typescript
import { createBanner } from '@peektree/banner'
import '@peektree/banner/styles.css'

createBanner({
  branch: 'feature-auth',
  onBack: () => { /* switch to main */ },
  onCopyScope: () => { /* copy context */ }
})
```

### React

```tsx
import { PeekBanner } from '@peektree/banner/react'
import '@peektree/banner/styles.css'

function App() {
  return (
    <>
      <PeekBanner
        branch="feature-auth"
        onBack={() => { /* switch to main */ }}
        onCopyScope={() => { /* copy context */ }}
      />
      {/* your app */}
    </>
  )
}
```

## Why Separate?

The banner is a separate package to:

1. Allow Vite and Next plugins to share UI
2. Enable users to customize or eject
3. Support independent versioning

## License

MIT

