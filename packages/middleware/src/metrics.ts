import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export interface SwitchMetric {
  timestamp: number
  from: string
  to: string
  duration: number
  success: boolean
}

export interface SessionMetric {
  id: string
  branch: string
  worktreePath: string
  startedAt: number
  endedAt?: number
  outcome?: 'saved' | 'discarded' | 'abandoned'
  switches: number
}

export interface MetricsData {
  switches: SwitchMetric[]
  sessions: SessionMetric[]
  totals: {
    totalSwitches: number
    totalSessions: number
    savedSessions: number
    discardedSessions: number
    avgSwitchTime: number
    avgSessionDuration: number
  }
}

const METRICS_DIR = join(homedir(), '.config', 'peek')
const METRICS_FILE = join(METRICS_DIR, 'metrics.json')
const MAX_HISTORY = 1000

let metricsCache: MetricsData | null = null

/**
 * Load metrics from disk
 */
export function loadMetrics(): MetricsData {
  if (metricsCache) return metricsCache

  const defaults: MetricsData = {
    switches: [],
    sessions: [],
    totals: {
      totalSwitches: 0,
      totalSessions: 0,
      savedSessions: 0,
      discardedSessions: 0,
      avgSwitchTime: 0,
      avgSessionDuration: 0
    }
  }

  if (!existsSync(METRICS_FILE)) {
    return defaults
  }

  try {
    const data = JSON.parse(readFileSync(METRICS_FILE, 'utf8'))
    const merged = { ...defaults, ...data }
    metricsCache = merged
    return merged
  } catch {
    return defaults
  }
}

/**
 * Save metrics to disk
 */
function saveMetrics(data: MetricsData): void {
  if (!existsSync(METRICS_DIR)) {
    mkdirSync(METRICS_DIR, { recursive: true })
  }

  // Trim history
  if (data.switches.length > MAX_HISTORY) {
    data.switches = data.switches.slice(-MAX_HISTORY)
  }
  if (data.sessions.length > MAX_HISTORY) {
    data.sessions = data.sessions.slice(-MAX_HISTORY)
  }

  writeFileSync(METRICS_FILE, JSON.stringify(data, null, 2))
  metricsCache = data
}

/**
 * Record a worktree switch
 */
export function recordSwitch(from: string, to: string, duration: number, success: boolean): void {
  const metrics = loadMetrics()

  metrics.switches.push({
    timestamp: Date.now(),
    from,
    to,
    duration,
    success
  })

  metrics.totals.totalSwitches++

  // Recalculate average
  const successfulSwitches = metrics.switches.filter(s => s.success)
  if (successfulSwitches.length > 0) {
    metrics.totals.avgSwitchTime =
      successfulSwitches.reduce((acc, s) => acc + s.duration, 0) / successfulSwitches.length
  }

  saveMetrics(metrics)
}

/**
 * Start a new session
 */
export function startSession(worktreePath: string, branch: string): string {
  const metrics = loadMetrics()
  const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  metrics.sessions.push({
    id,
    branch,
    worktreePath,
    startedAt: Date.now(),
    switches: 0
  })

  metrics.totals.totalSessions++
  saveMetrics(metrics)

  return id
}

/**
 * End a session
 */
export function endSession(worktreePath: string, outcome: 'saved' | 'discarded' | 'abandoned'): void {
  const metrics = loadMetrics()
  const session = metrics.sessions.find(s => s.worktreePath === worktreePath && !s.endedAt)

  if (session) {
    session.endedAt = Date.now()
    session.outcome = outcome

    if (outcome === 'saved') {
      metrics.totals.savedSessions++
    } else if (outcome === 'discarded') {
      metrics.totals.discardedSessions++
    }

    // Recalculate average session duration
    const completedSessions = metrics.sessions.filter(s => s.endedAt)
    if (completedSessions.length > 0) {
      metrics.totals.avgSessionDuration =
        completedSessions.reduce((acc, s) => acc + (s.endedAt! - s.startedAt), 0) / completedSessions.length
    }

    saveMetrics(metrics)
  }
}

/**
 * Clear all metrics
 */
export function clearMetrics(): void {
  const empty: MetricsData = {
    switches: [],
    sessions: [],
    totals: {
      totalSwitches: 0,
      totalSessions: 0,
      savedSessions: 0,
      discardedSessions: 0,
      avgSwitchTime: 0,
      avgSessionDuration: 0
    }
  }
  saveMetrics(empty)
  metricsCache = null
}

/**
 * Get formatted metrics summary
 */
export function getMetricsSummary(): string {
  const m = loadMetrics()
  const lines: string[] = []

  lines.push('📊 Peek Metrics')
  lines.push('')
  lines.push(`Total Switches: ${m.totals.totalSwitches}`)
  lines.push(`Avg Switch Time: ${m.totals.avgSwitchTime.toFixed(0)}ms`)
  lines.push('')
  lines.push(`Total Sessions: ${m.totals.totalSessions}`)
  lines.push(`Saved: ${m.totals.savedSessions}`)
  lines.push(`Discarded: ${m.totals.discardedSessions}`)
  lines.push(`Avg Duration: ${formatDuration(m.totals.avgSessionDuration)}`)

  return lines.join('\n')
}

/**
 * High-precision timer for measuring operations
 */
export interface Timer {
  elapsed(): number
  format(): string
}

export function startTimer(): Timer {
  const start = performance.now()
  return {
    elapsed: () => performance.now() - start,
    format: () => {
      const ms = performance.now() - start
      if (ms < 1000) return `${ms.toFixed(0)}ms`
      return `${(ms / 1000).toFixed(2)}s`
    }
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}

