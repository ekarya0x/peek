import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const PEEKRC_TEMPLATE = `{
  // Dev server port (default: 3000)
  "port": 3000,
  
  // WebSocket port for live updates (default: 24789)
  "wsPort": 24789,
  
  // Where to create worktrees (default: /tmp/peek)
  "worktreeDir": "/tmp/peek",
  
  // Branch prefix for agent sessions (default: "agent")
  "branchPrefix": "agent",
  
  // Enable metrics collection (default: true)
  "metrics": true
}
`

const PEEKIGNORE_TEMPLATE = `# Sharing strategies for worktrees
# Format: <pattern> <strategy>
# Strategies: symlink, hardlink, copy, skip

node_modules symlink
.next skip
dist skip
.turbo skip
coverage skip
`

export async function initCmd(): Promise<void> {
  const cwd = process.cwd()

  const viteConfig = findConfig(cwd, ['vite.config.ts', 'vite.config.js'])
  const nextConfig = findConfig(cwd, ['next.config.js', 'next.config.ts', 'next.config.mjs'])

  console.log('\n🔧 Initializing peek\n')

  // Create .peekrc.json if missing
  const peekrcPath = join(cwd, '.peekrc.json')
  if (!existsSync(peekrcPath)) {
    writeFileSync(peekrcPath, PEEKRC_TEMPLATE)
    console.log('  ✓ Created .peekrc.json')
  } else {
    console.log('  · .peekrc.json exists')
  }

  // Create .peekignore if missing
  const peekignorePath = join(cwd, '.peekignore')
  if (!existsSync(peekignorePath)) {
    writeFileSync(peekignorePath, PEEKIGNORE_TEMPLATE)
    console.log('  ✓ Created .peekignore')
  } else {
    console.log('  · .peekignore exists')
  }

  console.log('')

  if (viteConfig) {
    console.log('Detected: Vite\n')
    console.log('Add to vite.config.ts:')
    console.log('')
    console.log('  import peek from \'@ekarya0x/vite-plugin\'')
    console.log('')
    console.log('  export default defineConfig({')
    console.log('    plugins: [peek()]')
    console.log('  })')
    console.log('')
    console.log('Install:')
    console.log('  pnpm add -D @ekarya0x/cli @ekarya0x/vite-plugin')
    return
  }

  if (nextConfig) {
    console.log('Detected: Next.js\n')
    console.log('Update next.config.ts:')
    console.log('')
    console.log('  import withPeek from \'@ekarya0x/next-plugin\'')
    console.log('')
    console.log('  export default withPeek()(nextConfig)')
    console.log('')
    console.log('Install:')
    console.log('  pnpm add -D @ekarya0x/cli @ekarya0x/next-plugin')
    return
  }

  console.log('No supported framework detected.\n')
  console.log('Supported: Vite, Next.js')
  console.log('')
  console.log('Install CLI only:')
  console.log('  pnpm add -D @ekarya0x/cli')
}

function findConfig(dir: string, names: string[]): string | null {
  for (const name of names) {
    const path = join(dir, name)
    if (existsSync(path)) return path
  }
  return null
}
