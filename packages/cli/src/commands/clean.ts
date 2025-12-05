import { readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { removeWorktree, isValidWorktree } from '@peek/middleware'

interface CleanOptions {
  force?: boolean
}

export async function cleanCmd(opts: CleanOptions): Promise<void> {
  const peekDir = '/tmp/peek'

  if (!existsSync(peekDir)) {
    console.log('No peek worktrees to clean.')
    return
  }

  const entries = readdirSync(peekDir)
  let cleaned = 0

  for (const entry of entries) {
    const path = join(peekDir, entry)
    
    if (!isValidWorktree(path)) continue

    const result = removeWorktree({
      cwd: process.cwd(),
      path,
      force: opts.force
    })

    if (result.success) {
      console.log(`Removed: ${path}`)
      cleaned++
    } else {
      console.error(`Failed to remove ${path}: ${result.error}`)
    }
  }

  console.log(`\nCleaned ${cleaned} worktree(s).`)
}

