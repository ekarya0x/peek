import { execSync, exec } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export interface GitVersion {
  major: number
  minor: number
  patch: number
  raw: string
}

export interface GitInfo {
  version: GitVersion
  path: string
  hasLFS: boolean
  hasWorktreeSupport: boolean
}

export interface GitCompatibility {
  supported: boolean
  warnings: string[]
  errors: string[]
  version: GitVersion
}

interface VersionTuple {
  major: number
  minor: number
  patch: number
}

const MIN_VERSION: VersionTuple = { major: 2, minor: 20, patch: 0 }
const RECOMMENDED_VERSION: VersionTuple = { major: 2, minor: 37, patch: 0 }

const CACHE_DIR = join(homedir(), '.config', 'peek', 'cache')
const VERSION_CACHE_FILE = join(CACHE_DIR, 'git-versions.json')
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

type VersionCache = Record<string, { version: GitVersion; timestamp: number }>

/**
 * Get git version for a specific path (may differ per repo)
 */
export function getGitVersion(cwd: string = process.cwd()): GitVersion {
  // Check cache first
  const cached = getCachedVersion(cwd)
  if (cached) return cached

  try {
    const output = execSync('git --version', { cwd, encoding: 'utf8' })
    const match = output.match(/git version (\d+)\.(\d+)\.(\d+)/)
    
    if (!match) {
      return { major: 0, minor: 0, patch: 0, raw: output.trim() }
    }

    const version: GitVersion = {
      major: parseInt(match[1]!, 10),
      minor: parseInt(match[2]!, 10),
      patch: parseInt(match[3]!, 10),
      raw: output.trim()
    }

    cacheVersion(cwd, version)
    return version
  } catch {
    return { major: 0, minor: 0, patch: 0, raw: 'unknown' }
  }
}

/**
 * Check git compatibility and return warnings/errors
 */
export function checkGitCompatibility(cwd: string = process.cwd()): GitCompatibility {
  const version = getGitVersion(cwd)
  const warnings: string[] = []
  const errors: string[] = []

  if (compareVersions(version, MIN_VERSION) < 0) {
    errors.push(
      `Git version ${formatVersion(version)} is too old. ` +
      `Minimum required: ${formatVersion(MIN_VERSION)}. ` +
      `Please upgrade git.`
    )
  } else if (compareVersions(version, RECOMMENDED_VERSION) < 0) {
    warnings.push(
      `Git version ${formatVersion(version)} may have worktree bugs. ` +
      `Recommended: ${formatVersion(RECOMMENDED_VERSION)} or higher.`
    )
  }

  return {
    supported: errors.length === 0,
    warnings,
    errors,
    version
  }
}

/**
 * Get detailed git info for a repository
 */
export function getGitInfo(cwd: string = process.cwd()): GitInfo {
  const version = getGitVersion(cwd)
  
  let hasLFS = false
  try {
    execSync('git lfs version', { cwd, stdio: 'pipe' })
    hasLFS = true
  } catch {
    hasLFS = false
  }

  return {
    version,
    path: cwd,
    hasLFS,
    hasWorktreeSupport: compareVersions(version, { major: 2, minor: 5, patch: 0 }) >= 0
  }
}

/**
 * Execute git command with version-aware flags
 */
export function gitExec(
  command: string,
  cwd: string = process.cwd()
): string {
  const version = getGitVersion(cwd)
  
  // Add version-specific flags
  let modifiedCommand = command
  
  // Git 2.37+ has better worktree handling
  if (command.includes('worktree add') && compareVersions(version, RECOMMENDED_VERSION) >= 0) {
    // Use --track for better remote tracking
    if (!command.includes('--track') && !command.includes('--no-track')) {
      modifiedCommand = command.replace('worktree add', 'worktree add --track')
    }
  }

  return execSync(modifiedCommand, { cwd, encoding: 'utf8' })
}

/**
 * Check if a repository has uncommitted changes
 */
export function hasUncommittedChanges(cwd: string): boolean {
  try {
    const status = execSync('git status --porcelain', { cwd, encoding: 'utf8' })
    return status.trim().length > 0
  } catch {
    return false
  }
}

/**
 * Get the current branch name
 */
export function getCurrentBranch(cwd: string): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { 
      cwd, 
      encoding: 'utf8' 
    }).trim()
  } catch {
    return 'unknown'
  }
}

/**
 * Get the merge base between two branches
 */
export function getMergeBase(cwd: string, branch1: string, branch2: string): string | null {
  try {
    return execSync(`git merge-base ${branch1} ${branch2}`, {
      cwd,
      encoding: 'utf8'
    }).trim()
  } catch {
    return null
  }
}

/**
 * Get diff stats between two refs
 */
export function getDiffStats(cwd: string, from: string, to: string): DiffStats {
  try {
    const output = execSync(`git diff --numstat ${from}...${to}`, {
      cwd,
      encoding: 'utf8'
    })

    let insertions = 0
    let deletions = 0
    let files = 0

    for (const line of output.split('\n')) {
      if (!line.trim()) continue
      const [add, del] = line.split('\t')
      if (add !== '-') insertions += parseInt(add!, 10)
      if (del !== '-') deletions += parseInt(del!, 10)
      files++
    }

    return { insertions, deletions, files }
  } catch {
    return { insertions: 0, deletions: 0, files: 0 }
  }
}

export interface DiffStats {
  insertions: number
  deletions: number
  files: number
}

/**
 * Predict merge conflict risk
 */
export function predictConflictRisk(cwd: string, branch: string): ConflictPrediction {
  const mainBranch = getCurrentBranch(cwd)
  const mergeBase = getMergeBase(cwd, mainBranch, branch)
  
  if (!mergeBase) {
    return { risk: 'unknown', score: -1, recommendation: 'Could not determine merge base' }
  }

  const stats = getDiffStats(cwd, mergeBase, branch)
  const totalChanges = stats.insertions + stats.deletions

  if (totalChanges === 0) {
    return { risk: 'none', score: 0, recommendation: 'No changes to merge' }
  }

  if (totalChanges < 100) {
    return { risk: 'low', score: totalChanges, recommendation: 'Safe to merge' }
  }

  if (totalChanges < 500) {
    return { risk: 'medium', score: totalChanges, recommendation: 'Review carefully before merge' }
  }

  return {
    risk: 'high',
    score: totalChanges,
    recommendation: 'Consider rebasing or splitting into smaller changes'
  }
}

export interface ConflictPrediction {
  risk: 'none' | 'low' | 'medium' | 'high' | 'unknown'
  score: number
  recommendation: string
}

// Version comparison helpers

function compareVersions(a: VersionTuple, b: VersionTuple): number {
  if (a.major !== b.major) return a.major - b.major
  if (a.minor !== b.minor) return a.minor - b.minor
  return a.patch - b.patch
}

function formatVersion(v: VersionTuple): string {
  return `${v.major}.${v.minor}.${v.patch}`
}

// Caching helpers

function getCachedVersion(cwd: string): GitVersion | null {
  if (!existsSync(VERSION_CACHE_FILE)) return null

  try {
    const cache: VersionCache = JSON.parse(readFileSync(VERSION_CACHE_FILE, 'utf8'))
    const entry = cache[cwd]
    
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry.version
    }
    
    return null
  } catch {
    return null
  }
}

function cacheVersion(cwd: string, version: GitVersion): void {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true })
  }

  let cache: VersionCache = {}
  
  if (existsSync(VERSION_CACHE_FILE)) {
    try {
      cache = JSON.parse(readFileSync(VERSION_CACHE_FILE, 'utf8'))
    } catch {
      cache = {}
    }
  }

  cache[cwd] = { version, timestamp: Date.now() }
  writeFileSync(VERSION_CACHE_FILE, JSON.stringify(cache, null, 2))
}

