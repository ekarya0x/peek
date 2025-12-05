import { join } from 'node:path'
import { existsSync, mkdirSync } from 'node:fs'
import { createWorktree, listWorktrees, isValidWorktree } from '@ekarya0x/middleware'
import { switchCmd } from './switch.js'

interface StartOptions {
  base?: string
  port: string
  at?: string
}

/**
 * Start a new agent worktree session
 * 
 * Usage:
 *   peek start agent/feature     - Creates worktree for agent/feature branch
 *   peek start claude            - Creates worktree for claude branch  
 *   peek start --base develop    - Creates from develop branch
 * 
 * The worktree is created in /tmp/peek/<safe-branch-name> by default.
 * This keeps agent work isolated from your main branch.
 */
export async function startCmd(target: string, opts: StartOptions): Promise<void> {
  // Parse target - could be "agent/feature", "claude", or just "feature"
  const branch = target.startsWith('agent/') ? target : `agent/${target}`
  const safeName = branch.replace(/\//g, '-')
  const worktreePath = opts.at ?? join('/tmp/peek', safeName)

  // Check if worktree already exists
  const worktrees = listWorktrees(process.cwd())
  const existing = worktrees.find(w => 
    w.branch === branch || 
    w.path === worktreePath ||
    w.path.endsWith(`/${safeName}`)
  )

  if (existing) {
    console.log(`Agent session already exists: ${existing.branch}`)
    console.log(`Switching to existing worktree...`)
    await switchCmd(existing.path, opts.port)
    return
  }

  // Ensure /tmp/peek exists
  const peekDir = '/tmp/peek'
  if (!existsSync(peekDir)) {
    mkdirSync(peekDir, { recursive: true })
  }

  console.log(`\n🚀 Starting agent session: ${branch}`)
  console.log(`   Worktree: ${worktreePath}`)
  if (opts.base) {
    console.log(`   Base: ${opts.base}`)
  }
  console.log('')

  const result = createWorktree({
    cwd: process.cwd(),
    branch,
    path: worktreePath,
    base: opts.base ?? 'HEAD'
  })

  if (!result.success) {
    console.error(`❌ Failed to create worktree: ${result.error}`)
    process.exit(1)
  }

  console.log(`✓ Worktree created`)
  console.log(`✓ Switching dev server...`)
  
  await switchCmd(worktreePath, opts.port)

  console.log('')
  console.log(`Agent session ready!`)
  console.log(``)
  console.log(`  peek scope      # copy context for your agent`)
  console.log(`  peek save       # merge and keep changes`)
  console.log(`  peek discard    # abandon changes`)
  console.log(`  peek .          # back to main (keeps worktree)`)
}

