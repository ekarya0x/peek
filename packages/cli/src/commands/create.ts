import { join } from 'node:path'
import { createWorktree } from '@ekarya0x/middleware'
import { switchCmd } from './switch.js'

interface CreateOptions {
  base: string
  at?: string
  port: string
}

export async function createCmd(branch: string, opts: CreateOptions): Promise<void> {
  const safeBranch = branch.replace(/\//g, '-')
  const path = opts.at ?? join('/tmp/peek', safeBranch)

  console.log(`Creating worktree: ${branch} at ${path}`)

  const result = createWorktree({
    cwd: process.cwd(),
    branch,
    path,
    base: opts.base
  })

  if (!result.success) {
    console.error(`Error: ${result.error}`)
    process.exit(1)
  }

  console.log('Worktree created. Switching...')
  await switchCmd(path, opts.port)
}

