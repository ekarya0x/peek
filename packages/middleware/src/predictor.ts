/**
 * Predictive prefetching for sub-100ms switches
 * Analyzes switch patterns to predict next likely target
 */

import { loadMetrics } from './metrics.js'
import { precacheWorktree, getAvailableDiskSpace } from './optimizer.js'
import { listWorktrees } from './worktree.js'

const MIN_FREE_BYTES = 500 * 1024 * 1024 // 500MB minimum before prefetch

export interface PredictionResult {
  target: string
  confidence: number
  reason: string
}

/**
 * Predict the next likely worktree switch
 * Uses simple but effective heuristics:
 * - 80% of switches toggle between two worktrees
 * - After main, users often return to recent worktree
 */
export function predictNextSwitch(current: string): PredictionResult | null {
  const metrics = loadMetrics()
  const history = metrics.switches.slice(-20)

  if (history.length < 2) {
    return null
  }

  // Count transitions from current
  const transitions: Map<string, number> = new Map()
  for (let i = 0; i < history.length - 1; i++) {
    const from = history[i]!.to
    const to = history[i + 1]!.to
    if (from === current) {
      transitions.set(to, (transitions.get(to) ?? 0) + 1)
    }
  }

  if (transitions.size === 0) {
    return null
  }

  // Find most likely next target
  let best = ''
  let bestCount = 0
  for (const [target, count] of transitions) {
    if (count > bestCount) {
      best = target
      bestCount = count
    }
  }

  const total = Array.from(transitions.values()).reduce((a, b) => a + b, 0)
  const confidence = bestCount / total

  return {
    target: best,
    confidence,
    reason: confidence > 0.6 ? 'toggle pattern' : 'historical'
  }
}

/**
 * Get all likely next targets (for prefetch)
 */
export function getPrefetchCandidates(current: string, limit: number = 2): string[] {
  const metrics = loadMetrics()
  const history = metrics.switches.slice(-50)
  const candidates: Map<string, number> = new Map()

  for (let i = 0; i < history.length - 1; i++) {
    if (history[i]!.to === current) {
      const next = history[i + 1]!.to
      candidates.set(next, (candidates.get(next) ?? 0) + 1)
    }
  }

  return Array.from(candidates.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([target]) => target)
}

/**
 * Background prefetch with disk space check
 * Returns immediately, prefetch happens async
 */
export async function backgroundPrefetch(targets: string[]): Promise<void> {
  // Check disk space first
  const available = getAvailableDiskSpace()
  if (available < MIN_FREE_BYTES) {
    return // Don't prefetch if low on space
  }

  // Prefetch in background
  for (const target of targets) {
    precacheWorktree(target).catch(() => {
      // Best effort, ignore errors
    })
  }
}

/**
 * Get switch velocity (switches per hour)
 */
export function getSwitchVelocity(): number {
  const metrics = loadMetrics()
  const hour = 60 * 60 * 1000
  const recent = metrics.switches.filter(s => Date.now() - s.timestamp < hour)
  return recent.length
}

/**
 * Detect toggle pattern (rapid A→B→A→B)
 */
export function detectTogglePattern(): { a: string; b: string } | null {
  const metrics = loadMetrics()
  const recent = metrics.switches.slice(-10)

  if (recent.length < 4) return null

  // Check last 4 switches for A→B→A→B
  const last4 = recent.slice(-4).map(s => s.to)
  if (last4[0] === last4[2] && last4[1] === last4[3] && last4[0] !== last4[1]) {
    return { a: last4[0]!, b: last4[1]! }
  }

  return null
}

