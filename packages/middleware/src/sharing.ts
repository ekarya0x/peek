/**
 * Dependency sharing strategies for worktrees
 * 
 * Controls how node_modules and other large directories
 * are handled when creating worktrees.
 */

import { existsSync, readFileSync, symlinkSync, cpSync, linkSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { execSync } from 'node:child_process'

export type ShareStrategy = 'symlink' | 'hardlink' | 'copy' | 'skip'

export interface ShareRule {
  pattern: string
  strategy: ShareStrategy
}

const DEFAULT_RULES: ShareRule[] = [
  { pattern: 'node_modules', strategy: 'symlink' },
  { pattern: '.next', strategy: 'skip' },
  { pattern: 'dist', strategy: 'skip' },
  { pattern: '.turbo', strategy: 'skip' },
  { pattern: 'coverage', strategy: 'skip' }
]

/**
 * Load .peekignore rules from project root
 */
export function loadShareRules(projectRoot: string): ShareRule[] {
  const ignorePath = join(projectRoot, '.peekignore')
  if (!existsSync(ignorePath)) return DEFAULT_RULES

  try {
    const content = readFileSync(ignorePath, 'utf8')
    const rules: ShareRule[] = []

    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const parts = trimmed.split(/\s+/)
      if (parts.length >= 2) {
        const [pattern, strategy] = parts
        if (isValidStrategy(strategy!)) {
          rules.push({ pattern: pattern!, strategy: strategy as ShareStrategy })
        }
      } else if (parts.length === 1) {
        rules.push({ pattern: parts[0]!, strategy: 'skip' })
      }
    }

    return rules.length > 0 ? rules : DEFAULT_RULES
  } catch {
    return DEFAULT_RULES
  }
}

function isValidStrategy(s: string): boolean {
  return ['symlink', 'hardlink', 'copy', 'skip'].includes(s)
}

/**
 * Get strategy for a specific path
 */
export function getStrategy(rules: ShareRule[], relativePath: string): ShareStrategy | null {
  const name = relativePath.split('/').pop() ?? relativePath
  const rule = rules.find(r => r.pattern === name || relativePath.includes(r.pattern))
  return rule?.strategy ?? null
}

/**
 * Apply sharing strategy to a directory
 */
export function applyStrategy(
  sourcePath: string,
  targetPath: string,
  strategy: ShareStrategy
): { success: boolean; error?: string } {
  try {
    switch (strategy) {
      case 'skip':
        return { success: true }

      case 'symlink':
        if (!existsSync(sourcePath)) return { success: true }
        mkdirSync(dirname(targetPath), { recursive: true })
        symlinkSync(sourcePath, targetPath)
        return { success: true }

      case 'hardlink':
        if (!existsSync(sourcePath)) return { success: true }
        return hardlinkDir(sourcePath, targetPath)

      case 'copy':
        if (!existsSync(sourcePath)) return { success: true }
        cpSync(sourcePath, targetPath, { recursive: true })
        return { success: true }
    }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

/**
 * Hardlink entire directory (same disk, instant, zero extra space)
 */
function hardlinkDir(source: string, target: string): { success: boolean; error?: string } {
  try {
    // Use cp -al on macOS/Linux for instant hardlink copy
    mkdirSync(target, { recursive: true })
    execSync(`cp -al "${source}/." "${target}/"`, { stdio: 'pipe' })
    return { success: true }
  } catch {
    // Fallback to manual hardlink
    try {
      hardlinkRecursive(source, target)
      return { success: true }
    } catch (e) {
      return { success: false, error: String(e) }
    }
  }
}

function hardlinkRecursive(source: string, target: string): void {
  mkdirSync(target, { recursive: true })
  
  for (const entry of readdirSync(source)) {
    const srcPath = join(source, entry)
    const tgtPath = join(target, entry)
    const stat = statSync(srcPath)

    if (stat.isDirectory()) {
      hardlinkRecursive(srcPath, tgtPath)
    } else {
      linkSync(srcPath, tgtPath)
    }
  }
}

/**
 * Apply all sharing rules when creating a worktree
 */
export function applyShareRules(
  mainRepo: string,
  worktreePath: string,
  rules?: ShareRule[]
): { applied: number; skipped: number; errors: string[] } {
  const shareRules = rules ?? loadShareRules(mainRepo)
  let applied = 0
  let skipped = 0
  const errors: string[] = []

  for (const rule of shareRules) {
    const sourcePath = join(mainRepo, rule.pattern)
    const targetPath = join(worktreePath, rule.pattern)

    if (rule.strategy === 'skip') {
      skipped++
      continue
    }

    if (!existsSync(sourcePath)) {
      skipped++
      continue
    }

    const result = applyStrategy(sourcePath, targetPath, rule.strategy)
    if (result.success) {
      applied++
    } else {
      errors.push(`${rule.pattern}: ${result.error}`)
    }
  }

  return { applied, skipped, errors }
}

