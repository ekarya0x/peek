import { execSync } from 'node:child_process'
import { existsSync, readFileSync, statSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { WorktreeInfo } from './types.js'

/**
 * Check if a path is a valid git worktree
 * A worktree has a .git file (pointing to main repo) or .git directory (main repo itself)
 */
export function isValidWorktree(path: string): boolean {
  if (!path) return false
  
  try {
    const gitPath = join(path, '.git')
    if (!existsSync(gitPath)) return false
    
    const stat = statSync(gitPath)
    return stat.isDirectory() || stat.isFile()
  } catch {
    return false
  }
}

/**
 * Check if a worktree is locked (has ongoing operations)
 */
export function isWorktreeLocked(path: string): boolean {
  try {
    const gitPath = join(path, '.git')
    const stat = statSync(gitPath)
    
    if (stat.isFile()) {
      const content = readFileSync(gitPath, 'utf8').trim()
      const gitDir = content.replace('gitdir: ', '')
      const lockPath = join(gitDir, 'locked')
      return existsSync(lockPath)
    }
    
    // Main repo - check for index.lock
    const indexLock = join(gitPath, 'index.lock')
    return existsSync(indexLock)
  } catch {
    return false
  }
}

/**
 * Get detailed information about a worktree
 */
export function getWorktreeInfo(path: string, mainPath?: string): WorktreeInfo {
  const gitPath = join(path, '.git')
  let branch = 'detached'
  let commit = 'unknown'
  let isBare = false

  try {
    const stat = statSync(gitPath)
    
    if (stat.isDirectory()) {
      // This is the main repository
      const headPath = join(gitPath, 'HEAD')
      if (existsSync(headPath)) {
        const head = readFileSync(headPath, 'utf8').trim()
        if (head.startsWith('ref: refs/heads/')) {
          branch = head.replace('ref: refs/heads/', '')
        } else {
          // Detached HEAD
          commit = head.substring(0, 8)
          branch = 'detached'
        }
      }
    } else if (stat.isFile()) {
      // This is a linked worktree - .git is a file pointing to the actual git dir
      const gitContent = readFileSync(gitPath, 'utf8').trim()
      const gitDir = gitContent.replace('gitdir: ', '')
      const headPath = join(gitDir, 'HEAD')
      
      if (existsSync(headPath)) {
        const head = readFileSync(headPath, 'utf8').trim()
        if (head.startsWith('ref: refs/heads/')) {
          branch = head.replace('ref: refs/heads/', '')
        } else {
          commit = head.substring(0, 8)
          branch = 'detached'
        }
      }
    }

    // Get current commit hash
    commit = execSync('git rev-parse --short HEAD', { 
      cwd: path, 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'pipe'] 
    }).trim()
  } catch {
    // Silent fail - return what we have
  }

  return {
    path,
    branch,
    commit,
    isMain: mainPath ? path === mainPath : false,
    isBare
  }
}

/**
 * List all worktrees for a git repository
 */
export function listWorktrees(cwd: string): WorktreeInfo[] {
  try {
    const output = execSync('git worktree list --porcelain', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })

    const worktrees: WorktreeInfo[] = []
    let current: Partial<WorktreeInfo> = {}
    let isFirst = true

    for (const line of output.split('\n')) {
      if (line.startsWith('worktree ')) {
        current.path = line.replace('worktree ', '')
      } else if (line.startsWith('HEAD ')) {
        current.commit = line.replace('HEAD ', '').substring(0, 8)
      } else if (line.startsWith('branch ')) {
        current.branch = line.replace('branch refs/heads/', '')
      } else if (line === 'bare') {
        current.isBare = true
      } else if (line === 'detached') {
        current.branch = 'detached'
      } else if (line === '') {
        if (current.path) {
          worktrees.push({
            path: current.path,
            branch: current.branch ?? 'detached',
            commit: current.commit ?? 'unknown',
            isMain: isFirst,
            isBare: current.isBare ?? false
          })
          isFirst = false
        }
        current = {}
      }
    }

    return worktrees
  } catch {
    return []
  }
}

/**
 * Create a new worktree
 */
export function createWorktree(opts: {
  cwd: string
  branch: string
  path: string
  base?: string
}): { success: boolean; error?: string; path?: string } {
  const { cwd, branch, path, base = 'HEAD' } = opts

  // Validate inputs
  if (!branch || !path) {
    return { success: false, error: 'Branch and path are required' }
  }

  // Resolve path
  const absolutePath = path.startsWith('/') ? path : resolve(cwd, path)

  // Check if path already exists
  if (existsSync(absolutePath)) {
    if (isValidWorktree(absolutePath)) {
      // Already a worktree - return success
      return { success: true, path: absolutePath }
    }
    return { success: false, error: `Path already exists and is not a worktree: ${absolutePath}` }
  }

  try {
    // Try to create with new branch first
    execSync(`git worktree add -b "${branch}" "${absolutePath}" ${base}`, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return { success: true, path: absolutePath }
  } catch (e) {
    const err = e as Error & { stderr?: string }
    
    // Branch might already exist - try without -b
    if (err.stderr?.includes('already exists')) {
      try {
        execSync(`git worktree add "${absolutePath}" "${branch}"`, {
          cwd,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        })
        return { success: true, path: absolutePath }
      } catch (e2) {
        const err2 = e2 as Error & { stderr?: string }
        return { 
          success: false, 
          error: err2.stderr?.trim() ?? err2.message 
        }
      }
    }
    
    return { 
      success: false, 
      error: err.stderr?.trim() ?? err.message 
    }
  }
}

/**
 * Remove a worktree
 */
export function removeWorktree(opts: {
  cwd: string
  path: string
  force?: boolean
}): { success: boolean; error?: string } {
  const { cwd, path, force } = opts

  // Validate path
  if (!path) {
    return { success: false, error: 'Path is required' }
  }

  // Don't allow removing main worktree
  try {
    const worktrees = listWorktrees(cwd)
    const mainWorktree = worktrees.find(w => w.isMain)
    if (mainWorktree && mainWorktree.path === path) {
      return { success: false, error: 'Cannot remove main worktree' }
    }
  } catch {
    // Continue anyway
  }

  // Check if locked
  if (!force && isWorktreeLocked(path)) {
    return { success: false, error: 'Worktree is locked. Use --force to remove anyway.' }
  }

  try {
    const flags = force ? '--force' : ''
    execSync(`git worktree remove ${flags} "${path}"`, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return { success: true }
  } catch (e) {
    const err = e as Error & { stderr?: string }
    
    // If git worktree remove fails, try manual cleanup
    if (force) {
      try {
        // Remove the directory
        if (existsSync(path)) {
          rmSync(path, { recursive: true, force: true })
        }
        
        // Prune worktrees
        execSync('git worktree prune', {
          cwd,
          stdio: ['pipe', 'pipe', 'pipe']
        })
        
        return { success: true }
      } catch (cleanupErr) {
        return { 
          success: false, 
          error: `Failed to remove: ${(cleanupErr as Error).message}` 
        }
      }
    }
    
    return { 
      success: false, 
      error: err.stderr?.trim() ?? err.message 
    }
  }
}

/**
 * Prune stale worktree references
 */
export function pruneWorktrees(cwd: string): { success: boolean; pruned: number; error?: string } {
  try {
    const before = listWorktrees(cwd).length
    
    execSync('git worktree prune', {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    const after = listWorktrees(cwd).length
    
    return { success: true, pruned: before - after }
  } catch (e) {
    return { 
      success: false, 
      pruned: 0, 
      error: (e as Error).message 
    }
  }
}

/**
 * Check if a branch exists
 */
export function branchExists(cwd: string, branch: string): boolean {
  try {
    execSync(`git rev-parse --verify "${branch}"`, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return true
  } catch {
    return false
  }
}

/**
 * Get the main repository path from a worktree
 */
export function getMainRepoPath(worktreePath: string): string | null {
  const gitPath = join(worktreePath, '.git')
  
  try {
    const stat = statSync(gitPath)
    
    if (stat.isDirectory()) {
      // This IS the main repo
      return worktreePath
    }
    
    if (stat.isFile()) {
      // This is a linked worktree - .git contains path to main repo's .git/worktrees/
      const content = readFileSync(gitPath, 'utf8').trim()
      const gitDir = content.replace('gitdir: ', '')
      
      // gitDir looks like: /path/to/main/.git/worktrees/branch-name
      // We need to go up to find the main repo
      const mainGitDir = resolve(gitDir, '..', '..')
      const mainRepoPath = resolve(mainGitDir, '..')
      
      return mainRepoPath
    }
  } catch {
    return null
  }
  
  return null
}
