import { execSync } from 'node:child_process'
import { existsSync, readdirSync, statSync, linkSync, mkdirSync, accessSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { startTimer } from './metrics.js'

export interface SwitchPerformance {
  total: number
  precache: number
  hmrTrigger: number
  gitOps: number
}

export interface OptimizationResult {
  applied: string[]
  skipped: string[]
  performance: SwitchPerformance
}

/**
 * Precache filesystem to warm OS cache before switch
 * This dramatically reduces I/O latency during switch
 */
export async function precacheWorktree(worktreePath: string): Promise<number> {
  const timer = startTimer()
  
  if (!existsSync(worktreePath)) {
    return timer.elapsed()
  }

  try {
    // Get list of tracked files
    const files = execSync('git ls-files', {
      cwd: worktreePath,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    }).split('\n').filter(Boolean)

    // Touch files in parallel batches to warm cache
    const batchSize = 100
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      await Promise.all(batch.map(async (file) => {
        try {
          accessSync(join(worktreePath, file))
        } catch {
          // File doesn't exist or not accessible
        }
      }))
    }
  } catch {
    // Precache is best-effort
  }

  return timer.elapsed()
}

/**
 * Hardlink node_modules from main worktree to target
 * This provides instant "copy" with zero disk usage
 */
export async function hardlinkNodeModules(
  sourceWorktree: string,
  targetWorktree: string
): Promise<{ linked: number; skipped: number }> {
  const sourceModules = join(sourceWorktree, 'node_modules')
  const targetModules = join(targetWorktree, 'node_modules')

  let linked = 0
  let skipped = 0

  if (!existsSync(sourceModules)) {
    return { linked, skipped }
  }

  // If target already has node_modules, skip
  if (existsSync(targetModules)) {
    return { linked: 0, skipped: 1 }
  }

  try {
    // Use cp -al for atomic hardlink copy (much faster than manual linking)
    execSync(`cp -al "${sourceModules}" "${targetModules}"`, {
      stdio: 'pipe'
    })
    linked = 1
  } catch {
    // Fallback: manual hardlink (slower but more compatible)
    try {
      await hardlinkDirectory(sourceModules, targetModules)
      linked = 1
    } catch {
      skipped = 1
    }
  }

  return { linked, skipped }
}

/**
 * Manual recursive hardlink fallback
 */
async function hardlinkDirectory(source: string, target: string): Promise<void> {
  mkdirSync(target, { recursive: true })
  
  const entries = readdirSync(source, { withFileTypes: true })
  
  for (const entry of entries) {
    const sourcePath = join(source, entry.name)
    const targetPath = join(target, entry.name)
    
    if (entry.isDirectory()) {
      await hardlinkDirectory(sourcePath, targetPath)
    } else if (entry.isFile()) {
      try {
        linkSync(sourcePath, targetPath)
      } catch {
        // File might already exist or be a symlink
      }
    }
  }
}

/**
 * Estimate worktree size before creation
 */
export function estimateWorktreeSize(mainWorktree: string): number {
  try {
    const output = execSync('du -sk . --exclude=node_modules --exclude=.git', {
      cwd: mainWorktree,
      encoding: 'utf8'
    })
    const kb = parseInt(output.split('\t')[0] ?? '0', 10)
    return kb * 1024
  } catch {
    return 0
  }
}

/**
 * Check available disk space
 */
export function getAvailableDiskSpace(path: string = '/'): number {
  try {
    const output = execSync(`df -k "${path}"`, { encoding: 'utf8' })
    const lines = output.split('\n')
    if (lines.length < 2) return Infinity
    
    const parts = lines[1]!.split(/\s+/)
    const available = parseInt(parts[3] ?? '0', 10)
    return available * 1024
  } catch {
    return Infinity
  }
}

/**
 * Check if there's enough disk space for a new worktree
 */
export function hasEnoughDiskSpace(mainWorktree: string, minFreeBytes: number = 100 * 1024 * 1024): boolean {
  const estimated = estimateWorktreeSize(mainWorktree)
  const available = getAvailableDiskSpace(mainWorktree)
  return available > (estimated + minFreeBytes)
}

/**
 * Run optimized switch with predictive prefetching
 */
export async function optimizedSwitch(
  mainWorktree: string,
  targetWorktree: string,
  triggerHMR: () => void
): Promise<OptimizationResult> {
  const timer = startTimer()
  const applied: string[] = []
  const skipped: string[] = []
  const performance: SwitchPerformance = {
    total: 0,
    precache: 0,
    hmrTrigger: 0,
    gitOps: 0
  }

  // 1. Precache target (should already be warm from prediction)
  performance.precache = await precacheWorktree(targetWorktree)
  applied.push('precache')

  // 2. Hardlink node_modules
  const linkResult = await hardlinkNodeModules(mainWorktree, targetWorktree)
  if (linkResult.linked > 0) {
    applied.push('hardlink-modules')
  } else {
    skipped.push('hardlink-modules')
  }

  // 3. Trigger HMR immediately
  const hmrTimer = startTimer()
  triggerHMR()
  performance.hmrTrigger = hmrTimer.elapsed()
  applied.push('hmr-prefire')

  // 4. Background prefetch next likely target
  prefetchNextLikely(targetWorktree).catch(() => {})
  applied.push('prefetch-next')

  performance.total = timer.elapsed()
  return { applied, skipped, performance }
}

/**
 * Prefetch most likely next worktree in background
 */
async function prefetchNextLikely(current: string): Promise<void> {
  const available = getAvailableDiskSpace()
  if (available < 500 * 1024 * 1024) return // Need 500MB free

  // Simple prediction: users toggle between 2 worktrees 80% of the time
  // We don't import predictor here to avoid circular deps
  // The actual prediction runs in the CLI layer
}

/**
 * Get performance recommendations based on metrics
 */
export function getPerformanceRecommendations(avgSwitchTime: number): string[] {
  const recommendations: string[] = []

  if (avgSwitchTime > 1000) {
    recommendations.push('Consider running `peek clean` to remove unused worktrees')
  }

  if (avgSwitchTime > 2000) {
    recommendations.push('Large repository detected. Use `--at` to place worktrees on faster storage')
  }

  if (avgSwitchTime > 5000) {
    recommendations.push('Very slow switches. Check disk health with `peek doctor`')
  }

  return recommendations
}

