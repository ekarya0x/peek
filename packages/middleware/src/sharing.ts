/**
 * Dependency sharing strategies for worktrees
 * 
 * Controls how node_modules and other large directories
 * are handled when creating worktrees.
 */

import { existsSync, readFileSync, symlinkSync, cpSync, linkSync, readdirSync, statSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { execSync } from 'node:child_process'

export type ShareStrategy = 'symlink' | 'hardlink' | 'copy' | 'skip' | 'reflink'

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

const LOCKFILES = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock']

let hardlinkCapable: boolean | null = null
let reflinkCapable: boolean | null = null

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
  return ['symlink', 'hardlink', 'copy', 'skip', 'reflink'].includes(s)
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

      case 'reflink':
        if (!existsSync(sourcePath)) return { success: true }
        if (!isReflinkSupported()) {
          return { success: false, error: 'Reflinks not supported on this filesystem' }
        }
        mkdirSync(dirname(targetPath), { recursive: true })
        try {
          execSync(`cp --reflink=always -R "${sourcePath}" "${targetPath}"`, { stdio: 'pipe' })
          return { success: true }
        } catch (err) {
          return { success: false, error: String(err) }
        }

      case 'hardlink':
        if (!existsSync(sourcePath)) return { success: true }
        if (!isHardlinkSupported(sourcePath, targetPath)) {
          return { success: false, error: 'Hardlinks unsupported across devices or filesystem' }
        }
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
  const lockMismatch = detectLockfileMismatch(mainRepo, worktreePath)

  for (const rule of shareRules) {
    const sourcePath = join(mainRepo, rule.pattern)
    const targetPath = join(worktreePath, rule.pattern)

    if (rule.pattern === 'node_modules' && lockMismatch) {
      errors.push(`node_modules: lockfile mismatch (${lockMismatch}); use copy/install instead`)
      skipped++
      continue
    }

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

function detectLockfileMismatch(mainRepo: string, worktreePath: string): string | null {
  for (const name of LOCKFILES) {
    const mainLock = join(mainRepo, name)
    const worktreeLock = join(worktreePath, name)
    if (existsSync(mainLock) && existsSync(worktreeLock)) {
      const a = readFileSync(mainLock, 'utf8')
      const b = readFileSync(worktreeLock, 'utf8')
      if (a !== b) return name
    }
  }
  return null
}

function isHardlinkSupported(sourcePath: string, targetPath: string): boolean {
  if (hardlinkCapable !== null) return hardlinkCapable
  const tmp = mkdtempSync(join(tmpdir(), 'peek-hardlink-'))
  try {
    const src = join(tmp, 'src')
    const dst = join(tmp, 'dst')
    writeFileSync(src, 'peek')
    linkSync(src, dst)
    hardlinkCapable = true
  } catch {
    hardlinkCapable = false
  }
  return hardlinkCapable
}

function isReflinkSupported(): boolean {
  if (reflinkCapable !== null) return reflinkCapable
  const tmp = mkdtempSync(join(tmpdir(), 'peek-reflink-'))
  const src = join(tmp, 'src')
  const dst = join(tmp, 'dst')
  try {
    writeFileSync(src, 'peek')
    execSync(`cp --reflink=always "${src}" "${dst}"`, { stdio: 'pipe' })
    reflinkCapable = true
  } catch {
    reflinkCapable = false
  }
  return reflinkCapable
}

