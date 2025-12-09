import { loadMetrics, clearMetrics, getMetricsSummary } from '@peektree/middleware'

interface MetricsOptions {
  json?: boolean
  sessions?: boolean
  switches?: boolean
  limit?: string
}

/**
 * Show performance metrics
 */
export async function metricsCmd(opts: MetricsOptions): Promise<void> {
  const metrics = loadMetrics()
  const limit = parseInt(opts.limit ?? '10', 10)

  if (opts.json) {
    console.log(JSON.stringify(metrics, null, 2))
    return
  }

  console.log(getMetricsSummary())

  if (opts.sessions) {
    console.log('\n📋 Recent Sessions\n')
    const sessions = metrics.sessions.slice(-limit).reverse()

    if (sessions.length === 0) {
      console.log('  No sessions recorded.')
    } else {
      for (const session of sessions) {
        const duration = session.endedAt
          ? formatDuration(session.endedAt - session.startedAt)
          : 'ongoing'
        const outcome = session.outcome ?? '⏳'
        const icon = session.outcome === 'saved' ? '✅' : session.outcome === 'discarded' ? '🗑️' : '⏳'

        console.log(`  ${icon} ${session.branch}`)
        console.log(`     Duration: ${duration}`)
        console.log(`     Started: ${formatTime(session.startedAt)}`)
        if (session.endedAt) {
          console.log(`     Ended: ${formatTime(session.endedAt)}`)
        }
        console.log('')
      }
    }
  }

  if (opts.switches) {
    console.log('\n🔄 Recent Switches\n')
    const switches = metrics.switches.slice(-limit).reverse()

    if (switches.length === 0) {
      console.log('  No switches recorded.')
    } else {
      for (const sw of switches) {
        const icon = sw.success ? '✓' : '✗'
        const fromName = sw.from.split('/').pop()
        const toName = sw.to.split('/').pop()
        console.log(`  ${icon} ${fromName} → ${toName} (${sw.duration.toFixed(0)}ms)`)
        console.log(`     ${formatTime(sw.timestamp)}`)
      }
    }
  }

  if (!opts.sessions && !opts.switches) {
    console.log('\n  --sessions  Show session history')
    console.log('  --switches  Show switch history')
    console.log('  --json      Output raw data')
  }
}

/**
 * Clear all metrics
 */
export async function metricsClearCmd(): Promise<void> {
  clearMetrics()
  console.log('✅ Metrics cleared.')
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

