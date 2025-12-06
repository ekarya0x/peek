import { execSync, spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

/**
 * Enhanced federation features:
 * - SSH auth forwarding
 * - Git LFS support
 * - Submodule handling
 */

export interface SSHAuthConfig {
  keyPath?: string
  useAgent: boolean
  timeout: number
}

export interface LFSConfig {
  enabled: boolean
  fetchOnMount: boolean
}

export interface SubmoduleConfig {
  recursive: boolean
  depth?: number
}

export interface EnhancedFederationOptions {
  ssh?: SSHAuthConfig
  lfs?: LFSConfig
  submodules?: SubmoduleConfig
}

const DEFAULT_SSH_TIMEOUT = 30000

/**
 * Detect authentication method for a remote URL
 */
export function detectAuthMethod(remoteUrl: string): 'ssh' | 'https' | 'local' {
  if (remoteUrl.startsWith('git@') || remoteUrl.includes('ssh://')) {
    return 'ssh'
  }
  if (remoteUrl.startsWith('https://') || remoteUrl.startsWith('http://')) {
    return 'https'
  }
  return 'local'
}

/**
 * Get remote URL for a repository
 */
export function getRemoteUrl(repoPath: string, remote: string = 'origin'): string | null {
  try {
    return execSync(`git remote get-url ${remote}`, {
      cwd: repoPath,
      encoding: 'utf8'
    }).trim()
  } catch {
    return null
  }
}

/**
 * Check if SSH agent is available
 */
export function isSSHAgentAvailable(): boolean {
  return !!process.env.SSH_AUTH_SOCK
}

/**
 * Execute git command with SSH auth forwarding
 */
export async function gitWithSSH(
  command: string,
  cwd: string,
  options?: SSHAuthConfig
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const timeout = options?.timeout ?? DEFAULT_SSH_TIMEOUT
  
  return new Promise((resolve) => {
    const env = { ...process.env }
    
    // Use specific key if provided
    if (options?.keyPath) {
      env.GIT_SSH_COMMAND = `ssh -i ${options.keyPath} -o BatchMode=yes -o StrictHostKeyChecking=accept-new`
    }

    const proc = spawn('git', command.split(' '), {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => { stdout += data.toString() })
    proc.stderr.on('data', (data) => { stderr += data.toString() })

    const timer = setTimeout(() => {
      proc.kill('SIGTERM')
      resolve({ stdout, stderr: stderr + '\nSSH timeout', exitCode: 124 })
    }, timeout)

    proc.on('close', (code) => {
      clearTimeout(timer)
      resolve({ stdout, stderr, exitCode: code ?? 1 })
    })
  })
}

/**
 * Check if repository uses Git LFS
 */
export function hasLFS(repoPath: string): boolean {
  const gitattributes = join(repoPath, '.gitattributes')
  if (!existsSync(gitattributes)) return false

  try {
    const content = readFileSync(gitattributes, 'utf8')
    return content.includes('filter=lfs')
  } catch {
    return false
  }
}

/**
 * Fetch LFS objects for a worktree
 */
export async function fetchLFS(worktreePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    execSync('git lfs fetch', {
      cwd: worktreePath,
      stdio: 'pipe'
    })
    execSync('git lfs checkout', {
      cwd: worktreePath,
      stdio: 'pipe'
    })
    return { success: true }
  } catch (e) {
    const err = e as Error & { stderr?: string }
    return { success: false, error: err.stderr ?? err.message }
  }
}

/**
 * Check if repository has submodules
 */
export function hasSubmodules(repoPath: string): boolean {
  const gitmodules = join(repoPath, '.gitmodules')
  return existsSync(gitmodules)
}

/**
 * Initialize submodules in a worktree
 */
export async function initSubmodules(
  worktreePath: string,
  options?: SubmoduleConfig
): Promise<{ success: boolean; error?: string }> {
  const recursive = options?.recursive ?? true
  
  try {
    const flags = recursive ? '--recursive' : ''
    execSync(`git submodule update --init ${flags}`, {
      cwd: worktreePath,
      stdio: 'pipe'
    })
    return { success: true }
  } catch (e) {
    const err = e as Error & { stderr?: string }
    return { success: false, error: err.stderr ?? err.message }
  }
}

/**
 * Enhanced mount with LFS and submodule support
 */
export async function enhancedMount(
  projectPath: string,
  branch: string,
  mountPath: string,
  options?: EnhancedFederationOptions
): Promise<{ success: boolean; path?: string; error?: string; warnings: string[] }> {
  const warnings: string[] = []

  // Check auth method
  const remoteUrl = getRemoteUrl(projectPath)
  if (remoteUrl) {
    const authMethod = detectAuthMethod(remoteUrl)
    
    if (authMethod === 'ssh' && !isSSHAgentAvailable()) {
      warnings.push('SSH agent not available. May fail if key requires passphrase.')
    }
  }

  // Create worktree
  try {
    const flags = options?.submodules?.recursive ? '--recurse-submodules' : ''
    execSync(`git worktree add ${flags} "${mountPath}" "${branch}"`, {
      cwd: projectPath,
      stdio: 'pipe'
    })
  } catch (e) {
    const err = e as Error & { stderr?: string }
    return { success: false, error: err.stderr ?? err.message, warnings }
  }

  // Handle LFS
  if (options?.lfs?.enabled !== false && hasLFS(projectPath)) {
    if (options?.lfs?.fetchOnMount !== false) {
      const lfsResult = await fetchLFS(mountPath)
      if (!lfsResult.success) {
        warnings.push(`LFS fetch failed: ${lfsResult.error}`)
      }
    } else {
      warnings.push('LFS detected but fetch disabled. Run `git lfs fetch` manually.')
    }
  }

  // Handle submodules
  if (options?.submodules?.recursive !== false && hasSubmodules(projectPath)) {
    const subResult = await initSubmodules(mountPath, options?.submodules)
    if (!subResult.success) {
      warnings.push(`Submodule init failed: ${subResult.error}`)
    }
  }

  return { success: true, path: mountPath, warnings }
}

/**
 * Get federation diagnostics
 */
export function getFederationDiagnostics(projectPath: string): FederationDiagnostics {
  const diagnostics: FederationDiagnostics = {
    hasLFS: hasLFS(projectPath),
    hasSubmodules: hasSubmodules(projectPath),
    remoteUrl: getRemoteUrl(projectPath),
    authMethod: 'local',
    sshAgentAvailable: isSSHAgentAvailable(),
    issues: []
  }

  if (diagnostics.remoteUrl) {
    diagnostics.authMethod = detectAuthMethod(diagnostics.remoteUrl)
  }

  // Check for potential issues
  if (diagnostics.authMethod === 'ssh' && !diagnostics.sshAgentAvailable) {
    diagnostics.issues.push('SSH remote but no SSH agent - may fail with passphrase-protected keys')
  }

  if (diagnostics.hasLFS) {
    try {
      execSync('git lfs version', { stdio: 'pipe' })
    } catch {
      diagnostics.issues.push('Repository uses LFS but git-lfs is not installed')
    }
  }

  return diagnostics
}

export interface FederationDiagnostics {
  hasLFS: boolean
  hasSubmodules: boolean
  remoteUrl: string | null
  authMethod: 'ssh' | 'https' | 'local'
  sshAgentAvailable: boolean
  issues: string[]
}

