import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export async function initCmd(): Promise<void> {
  const cwd = process.cwd()

  const viteConfig = findConfig(cwd, ['vite.config.ts', 'vite.config.js'])
  const nextConfig = findConfig(cwd, ['next.config.js', 'next.config.ts', 'next.config.mjs'])

  if (viteConfig) {
    console.log('Detected Vite project.')
    console.log('\nAdd to your vite.config.ts:\n')
    console.log(`  import peek from '@ekarya0x/vite-plugin'`)
    console.log('')
    console.log('  export default defineConfig({')
    console.log('    plugins: [peek()]')
    console.log('  })')
    console.log('\nInstall:')
    console.log('  pnpm add -D @ekarya0x/vite-plugin')
    return
  }

  if (nextConfig) {
    console.log('Detected Next.js project.')
    console.log('\nNext.js support coming soon.')
    console.log('For now, use the express middleware.')
    return
  }

  console.log('No supported framework detected.')
  console.log('\nSupported frameworks:')
  console.log('  - Vite')
  console.log('  - Next.js (coming soon)')
  console.log('  - Express')
}

function findConfig(dir: string, names: string[]): string | null {
  for (const name of names) {
    const path = join(dir, name)
    if (existsSync(path)) return path
  }
  return null
}

