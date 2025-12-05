import { removeWorktree } from '@ekarya0x/middleware'
import { switchCmd } from './switch.js'

interface RemoveOptions {
  force?: boolean
  port?: string
}

export async function removeCmd(path: string, opts: RemoveOptions): Promise<void> {
  console.log(`Removing worktree: ${path}`)

  const result = removeWorktree({
    cwd: process.cwd(),
    path,
    force: opts.force
  })

  if (!result.success) {
    console.error(`Error: ${result.error}`)
    process.exit(1)
  }

  console.log('Worktree removed. Switching to main...')
  await switchCmd('.', opts.port || process.env.PEEK_PORT || '3000')
}

