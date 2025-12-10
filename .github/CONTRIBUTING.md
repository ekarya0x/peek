# Contributing to peek

Thanks for your interest in contributing to peek! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 9+
- Git 2.20+ (for worktree support)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/ekarya0x/peek
cd peek

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Project Structure

```
peek/
├── packages/
│   ├── cli/           # Command line interface
│   ├── middleware/    # Core worktree logic
│   ├── vite-plugin/   # Vite integration
│   ├── next-plugin/   # Next.js integration
│   └── banner/        # UI banner component
├── examples/
│   └── vite-react/    # Example Vite + React app
├── docs/              # Landing page
└── README.md
```

### Package Overview

| Package | Description |
|---------|-------------|
| `@peektree/cli` | CLI commands (`peek start`, `peek save`, etc.) |
| `@peektree/middleware` | Core logic for worktree switching |
| `@peektree/vite-plugin` | Vite plugin with HMR integration |
| `@peektree/next-plugin` | Next.js plugin |
| `@peektree/banner` | UI banner for development |

## Development Workflow

### Running in Development

```bash
# Watch mode for all packages
pnpm dev

# Test the CLI locally
cd packages/cli
pnpm build
node dist/index.js --help
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests for a specific package
cd packages/middleware
pnpm test
```

### Type Checking

```bash
# Check all packages
pnpm typecheck

# Check a specific package
cd packages/cli
pnpm typecheck
```

## Code Style

- We use TypeScript for all packages
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

### Commit Messages

We follow conventional commits:

```
feat: add new feature
fix: fix a bug
docs: update documentation
chore: maintenance tasks
refactor: code refactoring
test: add or update tests
```

## Submitting Changes

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Add tests if applicable
5. Run `pnpm build && pnpm test` to verify
6. Commit your changes with a meaningful message
7. Push to your fork and open a PR

### PR Guidelines

- Keep PRs focused on a single change
- Update documentation if needed
- Add tests for new functionality
- Ensure all CI checks pass

## Testing Locally

### Testing the CLI

```bash
# Build and link the CLI
cd packages/cli
pnpm build
npm link

# Now you can use `peek` command globally
peek --help
```

### Testing with Example Projects

```bash
# Start the example Vite app
cd examples/vite-react
pnpm install
pnpm dev

# In another terminal, test peek commands
peek list
peek create test-branch
peek test-branch
peek .
```

## Architecture Notes

### How peek Works

1. **Git Worktrees**: Each branch gets its own working directory
2. **PeekCore**: Manages state and switches between worktrees
3. **Plugins**: Integrate with Vite/Next.js dev servers
4. **WebSocket**: Real-time sync between CLI and browser
5. **HMR**: Triggers reload when worktree changes

### Key Files

- `packages/middleware/src/core.ts` - Core state management
- `packages/middleware/src/worktree.ts` - Git worktree operations
- `packages/vite-plugin/src/index.ts` - Vite integration
- `packages/cli/src/index.ts` - CLI entry point

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions
- Check existing issues before creating new ones

Thank you for contributing! 🙏

