import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync, symlinkSync, unlinkSync } from 'node:fs'
import { join, resolve, basename } from 'node:path'
import { homedir } from 'node:os'
import { loadConfig, saveConfig, type FederatedProject } from './config.js'
import { listWorktrees, createWorktree, isValidWorktree } from './worktree.js'

export interface FederationState {
  projects: Record<string, FederatedProject & { worktrees: string[] }>
  mounts: MountInfo[]
}

export interface MountInfo {
  project: string
  branch: string
  mountPath: string
  createdAt: number
}

const MOUNTS_FILE = join(homedir(), '.config', 'peek', 'mounts.json')

/**
 * Link a project to the federation
 */
export function federationLink(
  name: string,
  path: string,
  alias?: string
): { success: boolean; error?: string } {
  const absolutePath = resolve(path)

  if (!existsSync(absolutePath)) {
    return { success: false, error: `Path does not exist: ${absolutePath}` }
  }

  if (!isValidWorktree(absolutePath)) {
    return { success: false, error: `Not a git repository: ${absolutePath}` }
  }

  const config = loadConfig()
  config.federation.projects[name] = {
    path: absolutePath,
    alias: alias ?? name,
    lastAccessed: Date.now()
  }

  saveConfig({ federation: config.federation }, true)
  return { success: true }
}

/**
 * Unlink a project from the federation
 */
export function federationUnlink(name: string): { success: boolean; error?: string } {
  const config = loadConfig()

  if (!config.federation.projects[name]) {
    return { success: false, error: `Project not found: ${name}` }
  }

  delete config.federation.projects[name]
  saveConfig({ federation: config.federation }, true)
  return { success: true }
}

/**
 * List all federated projects with their branches
 */
export function federationList(): FederationState {
  const config = loadConfig()
  const mounts = loadMounts()

  const projects: FederationState['projects'] = {}

  for (const [name, project] of Object.entries(config.federation.projects)) {
    const worktrees = existsSync(project.path)
      ? listWorktrees(project.path).map(w => w.branch)
      : []

    projects[name] = {
      ...project,
      worktrees
    }
  }

  return { projects, mounts }
}

/**
 * Get branches from a federated project
 */
export function federationGetBranches(projectName: string): string[] {
  const config = loadConfig()
  const project = config.federation.projects[projectName]

  if (!project || !existsSync(project.path)) {
    return []
  }

  try {
    const output = execSync('git branch -a --format="%(refname:short)"', {
      cwd: project.path,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return output.split('\n').filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Mount a branch from a federated project as a worktree in the current project
 */
export function federationMount(
  projectName: string,
  branch: string,
  mountPath?: string
): { success: boolean; path?: string; error?: string } {
  const config = loadConfig()
  const project = config.federation.projects[projectName]

  if (!project) {
    return { success: false, error: `Project not found: ${projectName}` }
  }

  if (!existsSync(project.path)) {
    return { success: false, error: `Project path does not exist: ${project.path}` }
  }

  const targetPath = mountPath ?? join(
    config.federation.mountDir,
    `${projectName}-${branch.replace(/\//g, '-')}`
  )

  // Create mount directory if needed
  const mountDir = config.federation.mountDir
  if (!existsSync(mountDir)) {
    mkdirSync(mountDir, { recursive: true })
  }

  // Create worktree from the federated project
  const result = createWorktree({
    cwd: project.path,
    branch,
    path: targetPath,
    base: branch
  })

  if (!result.success) {
    return result
  }

  // Record the mount
  const mounts = loadMounts()
  mounts.push({
    project: projectName,
    branch,
    mountPath: targetPath,
    createdAt: Date.now()
  })
  saveMounts(mounts)

  // Update last accessed
  const proj = config.federation.projects[projectName]
  if (proj) {
    proj.lastAccessed = Date.now()
    saveConfig({ federation: config.federation }, true)
  }

  return { success: true, path: targetPath }
}

/**
 * Unmount a federated worktree
 */
export function federationUnmount(
  projectName: string,
  mountPath: string
): { success: boolean; error?: string } {
  const config = loadConfig()
  const project = config.federation.projects[projectName]

  if (!project) {
    return { success: false, error: `Project not found: ${projectName}` }
  }

  try {
    execSync(`git worktree remove "${mountPath}"`, {
      cwd: project.path,
      stdio: ['pipe', 'pipe', 'pipe']
    })
  } catch (e) {
    const err = e as Error & { stderr?: string }
    return { success: false, error: err.stderr ?? err.message }
  }

  // Remove from mounts
  const mounts = loadMounts()
  const idx = mounts.findIndex(m => m.mountPath === mountPath)
  if (idx >= 0) {
    mounts.splice(idx, 1)
    saveMounts(mounts)
  }

  return { success: true }
}

/**
 * Switch to a branch in a federated project (cd + checkout)
 */
export function federationSwitch(
  projectName: string,
  branch: string
): { success: boolean; path?: string; error?: string } {
  const config = loadConfig()
  const project = config.federation.projects[projectName]

  if (!project) {
    return { success: false, error: `Project not found: ${projectName}` }
  }

  try {
    execSync(`git checkout "${branch}"`, {
      cwd: project.path,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return { success: true, path: project.path }
  } catch (e) {
    const err = e as Error & { stderr?: string }
    return { success: false, error: err.stderr ?? err.message }
  }
}

/**
 * Get scope/context from a federated project
 */
export function federationGetScope(projectName: string): string | null {
  const config = loadConfig()
  const project = config.federation.projects[projectName]

  if (!project || !existsSync(project.path)) {
    return null
  }

  const lines: string[] = []
  lines.push(`# Federated Project: ${projectName}`)
  lines.push(`Path: ${project.path}`)
  lines.push('')

  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: project.path,
      encoding: 'utf8'
    }).trim()
    lines.push(`Branch: ${branch}`)

    const status = execSync('git status --short', {
      cwd: project.path,
      encoding: 'utf8'
    }).trim()
    lines.push('')
    lines.push('Changes:')
    lines.push(status || '(none)')
  } catch {
    lines.push('(Unable to read git state)')
  }

  return lines.join('\n')
}

function loadMounts(): MountInfo[] {
  if (!existsSync(MOUNTS_FILE)) {
    return []
  }
  try {
    return JSON.parse(readFileSync(MOUNTS_FILE, 'utf8'))
  } catch {
    return []
  }
}

function saveMounts(mounts: MountInfo[]): void {
  const dir = join(homedir(), '.config', 'peek')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(MOUNTS_FILE, JSON.stringify(mounts, null, 2))
}

