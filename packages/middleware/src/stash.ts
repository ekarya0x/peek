/**
 * Internal stash management for peek
 * 
 * Uncommitted changes are stashed (not deleted) during discard,
 * with pointers stored in peek's metadata for recovery.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { execSync } from 'node:child_process'

const STASH_DIR = join(homedir(), '.config', 'peek', 'stashes')
const STASH_INDEX = join(STASH_DIR, 'index.json')

export interface StashEntry {
  id: string
  branch: string
  worktreePath: string
  timestamp: number
  message: string
  files: number
  gitStashRef?: string
}

function ensureStashDir(): void {
  if (!existsSync(STASH_DIR)) {
    mkdirSync(STASH_DIR, { recursive: true })
  }
}

function loadIndex(): StashEntry[] {
  if (!existsSync(STASH_INDEX)) return []
  try {
    return JSON.parse(readFileSync(STASH_INDEX, 'utf8'))
  } catch {
    return []
  }
}

function saveIndex(entries: StashEntry[]): void {
  ensureStashDir()
  writeFileSync(STASH_INDEX, JSON.stringify(entries, null, 2))
}

/**
 * Stash uncommitted changes from a worktree before discard
 */
export function stashChanges(worktreePath: string, branch: string): StashEntry | null {
  try {
    const status = execSync('git status --porcelain', {
      cwd: worktreePath,
      encoding: 'utf8'
    }).trim()

    if (!status) return null

    const files = status.split('\n').length
    const id = `stash-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const message = `Auto-stash from ${branch} before discard`

    // Create git stash
    execSync(`git stash push -m "${message}"`, {
      cwd: worktreePath,
      stdio: 'pipe'
    })

    // Get stash ref
    const stashList = execSync('git stash list --format="%H %s" -n 1', {
      cwd: worktreePath,
      encoding: 'utf8'
    }).trim()
    
    const gitStashRef = stashList.split(' ')[0]

    const entry: StashEntry = {
      id,
      branch,
      worktreePath,
      timestamp: Date.now(),
      message,
      files,
      gitStashRef
    }

    const index = loadIndex()
    index.unshift(entry)
    saveIndex(index.slice(0, 50)) // Keep last 50

    return entry
  } catch {
    return null
  }
}

/**
 * List all stashed changes
 */
export function listStashes(): StashEntry[] {
  return loadIndex()
}

/**
 * Get a specific stash by ID
 */
export function getStash(id: string): StashEntry | null {
  const index = loadIndex()
  return index.find(e => e.id === id) ?? null
}

/**
 * Apply stash to a target worktree
 */
export function applyStash(id: string, targetPath: string): boolean {
  const entry = getStash(id)
  if (!entry?.gitStashRef) return false

  try {
    // Create a patch from the stash and apply it
    execSync(`git stash show -p ${entry.gitStashRef} | git apply --directory="${targetPath}"`, {
      stdio: 'pipe'
    })
    return true
  } catch {
    return false
  }
}

/**
 * Remove a stash entry
 */
export function dropStash(id: string): boolean {
  const index = loadIndex()
  const filtered = index.filter(e => e.id !== id)
  if (filtered.length === index.length) return false
  saveIndex(filtered)
  return true
}

/**
 * Clear all stashes older than maxAge (default 7 days)
 */
export function pruneStashes(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
  const cutoff = Date.now() - maxAge
  const index = loadIndex()
  const filtered = index.filter(e => e.timestamp > cutoff)
  const removed = index.length - filtered.length
  saveIndex(filtered)
  return removed
}

