/**
 * Worktree metadata - track why worktrees exist
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import { getCurrentBranch } from './git.js'

export interface WorktreeMetadata {
  created: number
  purpose: string
  parent: string
  agent?: string
  prompt?: string
  complexity?: 'low' | 'medium' | 'high'
}

const METADATA_FILE = '.peek-meta.json'

/**
 * Create metadata for a new worktree
 */
export function createMetadata(
  worktreePath: string,
  purpose: string,
  mainPath: string,
  options?: { agent?: string; prompt?: string }
): void {
  const meta: WorktreeMetadata = {
    created: Date.now(),
    purpose,
    parent: getCurrentBranch(mainPath),
    agent: options?.agent ?? process.env.PEEK_AGENT,
    prompt: options?.prompt ?? process.env.PEEK_PROMPT
  }

  const metaPath = join(worktreePath, METADATA_FILE)

  try {
    writeFileSync(metaPath, JSON.stringify(meta, null, 2))
  } catch {
    // Best effort
  }
}

/**
 * Read metadata from a worktree
 */
export function getMetadata(worktreePath: string): WorktreeMetadata | null {
  const metaPath = join(worktreePath, METADATA_FILE)

  if (!existsSync(metaPath)) return null

  try {
    return JSON.parse(readFileSync(metaPath, 'utf8'))
  } catch {
    return null
  }
}

/**
 * Format metadata for display
 */
export function formatMetadata(meta: WorktreeMetadata): string {
  const age = formatAge(meta.created)
  const parts = [age]

  if (meta.agent) {
    parts.push(meta.agent)
  } else if (meta.purpose) {
    parts.push(meta.purpose.slice(0, 30))
  }

  return parts.join(', ')
}

/**
 * Format age in human-readable form
 */
function formatAge(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'just now'
}

/**
 * Update metadata
 */
export function updateMetadata(
  worktreePath: string,
  updates: Partial<WorktreeMetadata>
): void {
  const existing = getMetadata(worktreePath) ?? {
    created: Date.now(),
    purpose: 'unknown',
    parent: 'unknown'
  }

  const updated = { ...existing, ...updates }
  const metaPath = join(worktreePath, METADATA_FILE)

  try {
    writeFileSync(metaPath, JSON.stringify(updated, null, 2))
  } catch {
    // Best effort
  }
}

/**
 * Infer purpose from branch name
 */
export function inferPurpose(branchName: string): string {
  const name = basename(branchName)

  if (name.startsWith('agent-') || name.startsWith('peek-')) {
    return `Agent: ${name.replace(/^(agent-|peek-)/, '')}`
  }

  if (name.includes('fix')) return 'Bugfix'
  if (name.includes('feat')) return 'Feature'
  if (name.includes('refactor')) return 'Refactor'
  if (name.includes('test')) return 'Testing'

  return name
}

