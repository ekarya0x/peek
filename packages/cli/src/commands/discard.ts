import { execSync } from 'node:child_process'
import { PeekCore, removeWorktree, getWorktreeInfo, endSession, startTimer, stashChanges } from '@peektree/middleware'
import { switchCmd } from './switch.js'

interface DiscardOptions {
  port?: string
  force?: boolean
}

/**
 * Discard agent work - abandon changes and remove worktree
 * 
 * Usage:
 *   peek discard           - Discard current agent worktree
 *   peek discard --force   - Skip confirmation
 * 
 * This command:
 * 1. Switches back to main
 * 2. Removes the worktree (all uncommitted work is lost)
 * 3. Deletes the agent branch
 */
export async function discardCmd(opts: DiscardOptions): Promise<void> {
  const timer = startTimer()
  const core = new PeekCore()
  const current = core.getCurrent()
  const main = core.getMain()
  const port = opts.port || process.env.PEEK_PORT || '3000'

  if (current === main) {
    console.error('❌ Already on main branch. Nothing to discard.')
    process.exit(1)
  }

  const info = getWorktreeInfo(current, main)

  // Check for uncommitted changes and warn
  if (!opts.force) {
    try {
      const status = execSync('git status --porcelain', { 
        cwd: current, 
        encoding: 'utf8' 
      }).trim()

      const commitLog = execSync('git log --oneline HEAD ^origin/HEAD 2>/dev/null || echo ""', {
        cwd: current,
        encoding: 'utf8'
      }).trim()

      if (status || commitLog) {
        console.log(`\n⚠️  This will permanently delete:`)
        console.log(`   Branch: ${info.branch}`)
        console.log(`   Path: ${current}`)
        
        if (status) {
          const lines = status.split('\n').length
          console.log(`   ${lines} uncommitted file(s)`)
        }
        
        if (commitLog) {
          const commits = commitLog.split('\n').length
          console.log(`   ${commits} unpushed commit(s)`)
        }
        
        console.log('')
        console.log(`   Run with --force to confirm.`)
        process.exit(1)
      }
    } catch {
      // Git command failed, proceed anyway
    }
  }

  console.log(`\n🗑️  Discarding agent work: ${info.branch}`)
  console.log('')

  // Step 0: Stash uncommitted changes (recoverable via `peek recover`)
  try {
    const stash = stashChanges(current, info.branch)
    if (stash) {
      console.log(`  📦 Stashed ${stash.files} file(s) (recoverable via \`peek recover\`)`)
    }
  } catch {
    // Continue even if stash fails
  }

  // Step 1: Switch to main first
  console.log(`  Switching to main...`)
  await switchCmd('.', port)

  // Step 2: Force remove the worktree
  console.log(`  Removing worktree...`)
  const removeResult = removeWorktree({
    cwd: main,
    path: current,
    force: true
  })

  if (!removeResult.success) {
    console.error(`  ⚠ Worktree removal failed: ${removeResult.error}`)
    // Try manual cleanup
    try {
      execSync(`rm -rf "${current}"`, { stdio: 'pipe' })
      execSync(`git worktree prune`, { cwd: main, stdio: 'pipe' })
      console.log(`  ✓ Cleaned up manually`)
    } catch {
      console.error(`  ❌ Manual cleanup also failed`)
    }
  } else {
    console.log(`  ✓ Worktree removed`)
  }

  // Step 3: Delete the branch
  console.log(`  Deleting branch...`)
  try {
    execSync(`git branch -D ${info.branch}`, { 
      cwd: main, 
      stdio: 'pipe' 
    })
    console.log(`  ✓ Branch deleted`)
  } catch {
    console.log(`  ⚠ Branch not found or already deleted`)
  }

  // Record session end
  endSession(current, 'discarded')

  const duration = timer.format()
  console.log('')
  console.log(`✅ Agent work discarded. (${duration})`)
}
