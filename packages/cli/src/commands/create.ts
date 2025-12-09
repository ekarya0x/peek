import { join } from 'node:path'
import { createWorktree } from '@peektree/middleware'
import { switchCmd } from './switch.js'

interface CreateOptions {
  base: string
  at?: string
  port?: string
}

export async function createCmd(branch: string, opts: CreateOptions): Promise<void> {
  const port = opts.port || process.env.PEEK_PORT || '3000'
  const slug = branch.trim()
    .replace(/^[\\/]+|[\\/]+$/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 64) || 'work'
  const safeBranch = slug
  const path = opts.at ?? join('/tmp/peek', `peek-${safeBranch}`)

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
  await switchCmd(path, port)
}

