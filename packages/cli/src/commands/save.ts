import { execSync } from 'node:child_process'
import { PeekCore, removeWorktree, getWorktreeInfo, endSession, startTimer } from '@ekarya0x/middleware'
import { switchCmd } from './switch.js'

interface SaveOptions {
  port?: string
  keep?: boolean
  message?: string
  push?: boolean
}

/**
 * Save agent work - merge changes back to parent branch
 * 
 * Usage:
 *   peek save                    - Merge to parent, remove worktree
 *   peek save --keep             - Merge but keep worktree
 *   peek save --message "feat"   - Custom merge commit message
 *   peek save --push             - Also push after merge
 * 
 * This command:
 * 1. Commits any uncommitted changes in the worktree
 * 2. Switches back to main
 * 3. Merges the agent branch
 * 4. Optionally removes the worktree
 */
export async function saveCmd(opts: SaveOptions): Promise<void> {
  const timer = startTimer()
  const core = new PeekCore()
  const current = core.getCurrent()
  const main = core.getMain()
  const port = opts.port || process.env.PEEK_PORT || '3000'

  if (current === main) {
    console.error('❌ Already on main branch. Nothing to save.')
    process.exit(1)
  }

  const info = getWorktreeInfo(current, main)
  
  console.log(`\n💾 Saving agent work: ${info.branch}`)
  console.log('')

  // Step 1: Check for uncommitted changes
  try {
    const status = execSync('git status --porcelain', { 
      cwd: current, 
      encoding: 'utf8' 
    }).trim()

    if (status) {
      console.log(`  Uncommitted changes detected. Committing...`)
      
      execSync('git add -A', { cwd: current, stdio: 'pipe' })
      
      const commitMsg = opts.message ?? `agent: complete ${info.branch}`
      execSync(`git commit -m "${commitMsg}"`, { 
        cwd: current, 
        stdio: 'pipe' 
      })
      
      console.log(`  ✓ Changes committed`)
    }
  } catch {
    // No changes to commit - that's fine
  }

  // Step 2: Switch to main
  console.log(`  Switching to main...`)
  await switchCmd('.', port)

  // Step 3: Merge the agent branch
  console.log(`  Merging ${info.branch}...`)
  try {
    execSync(`git merge ${info.branch} --no-ff -m "Merge ${info.branch}"`, {
      cwd: main,
      stdio: 'pipe'
    })
    console.log(`  ✓ Merged successfully`)
  } catch {
    console.error(`\n❌ Merge conflict detected!`)
    console.error(`   Resolve conflicts manually, then run:`)
    console.error(`   peek remove ${current}`)
    process.exit(1)
  }

  // Step 4: Optionally push
  if (opts.push) {
    console.log(`  Pushing to remote...`)
    try {
      execSync('git push', { cwd: main, stdio: 'pipe' })
      console.log(`  ✓ Pushed`)
    } catch {
      console.error(`  ⚠ Push failed - push manually`)
    }
  }

  // Step 5: Clean up worktree (unless --keep)
  if (!opts.keep) {
    console.log(`  Removing worktree...`)
    
    // First delete the branch
    try {
      execSync(`git branch -d ${info.branch}`, { 
        cwd: main, 
        stdio: 'pipe' 
      })
    } catch {
      // Branch might not exist or might need force delete
    }

    const removeResult = removeWorktree({
      cwd: main,
      path: current,
      force: true
    })

    if (removeResult.success) {
      console.log(`  ✓ Worktree removed`)
    } else {
      console.log(`  ⚠ Could not remove worktree: ${removeResult.error}`)
    }
  }

  // Record session end
  endSession(current, 'saved')

  const duration = timer.format()
  console.log('')
  console.log(`✅ Agent work saved! (${duration})`)
}
