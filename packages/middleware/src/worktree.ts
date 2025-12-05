import { execSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { WorktreeInfo } from './types.js'

export function isValidWorktree(path: string): boolean {
  const gitPath = join(path, '.git')
  if (!existsSync(gitPath)) return false
  const stat = statSync(gitPath)
  return stat.isDirectory() || stat.isFile()
}

export function getWorktreeInfo(path: string, mainPath?: string): WorktreeInfo {
  const gitPath = join(path, '.git')
  let branch = 'detached'
  let commit = 'unknown'
  let isBare = false

  try {
    const stat = statSync(gitPath)
    
    if (stat.isDirectory()) {
      const headPath = join(gitPath, 'HEAD')
      if (existsSync(headPath)) {
        const head = readFileSync(headPath, 'utf8').trim()
        if (head.startsWith('ref: refs/heads/')) {
          branch = head.replace('ref: refs/heads/', '')
        } else {
          commit = head.substring(0, 8)
        }
      }
    } else if (stat.isFile()) {
      const gitContent = readFileSync(gitPath, 'utf8').trim()
      const gitDir = gitContent.replace('gitdir: ', '')
      const headPath = join(gitDir, 'HEAD')
      if (existsSync(headPath)) {
        const head = readFileSync(headPath, 'utf8').trim()
        if (head.startsWith('ref: refs/heads/')) {
          branch = head.replace('ref: refs/heads/', '')
        } else {
          commit = head.substring(0, 8)
        }
      }
    }

    commit = execSync('git rev-parse --short HEAD', { cwd: path, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch {
    // Silent fail
  }

  return {
    path,
    branch,
    commit,
    isMain: mainPath ? path === mainPath : false,
    isBare
  }
}

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

export function createWorktree(opts: {
  cwd: string
  branch: string
  path: string
  base?: string
}): { success: boolean; error?: string } {
  const { cwd, branch, path, base = 'HEAD' } = opts

  try {
    execSync(`git worktree add -b ${branch} "${path}" ${base}`, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return { success: true }
  } catch (e) {
    const err = e as Error & { stderr?: string }
    if (err.stderr?.includes('already exists')) {
      try {
        execSync(`git worktree add "${path}" ${branch}`, {
          cwd,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        })
        return { success: true }
      } catch (e2) {
        return { success: false, error: (e2 as Error).message }
      }
    }
    return { success: false, error: err.message }
  }
}

export function removeWorktree(opts: {
  cwd: string
  path: string
  force?: boolean
}): { success: boolean; error?: string } {
  const { cwd, path, force } = opts

  try {
    const flags = force ? '--force' : ''
    execSync(`git worktree remove ${flags} "${path}"`, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

