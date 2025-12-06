import { execSync } from 'node:child_process'
import { listWorktrees, getWorktreeInfo, loadMetrics } from '@ekarya0x/middleware'

interface CompareOptions {
  stat?: boolean
  files?: boolean
}

/**
 * Compare two worktrees (Agent Deathmatch mode)
 * 
 * Shows diff between two agent branches to help pick a winner.
 */
export async function compareCmd(
  worktree1: string,
  worktree2: string,
  opts: CompareOptions
): Promise<void> {
  const cwd = process.cwd()
  const worktrees = listWorktrees(cwd)

  // Resolve worktree names to paths/branches
  const wt1 = resolveWorktree(worktree1, worktrees)
  const wt2 = resolveWorktree(worktree2, worktrees)

  if (!wt1) {
    console.error(`❌ Worktree not found: ${worktree1}`)
    process.exit(1)
  }

  if (!wt2) {
    console.error(`❌ Worktree not found: ${worktree2}`)
    process.exit(1)
  }

  console.log('\n⚔️  Agent Deathmatch\n')
  console.log(`  🥊 ${wt1.branch}`)
  console.log(`     vs`)
  console.log(`  🥊 ${wt2.branch}`)
  console.log('')

  try {
    if (opts.stat) {
      // Show diffstat
      const stat = execSync(`git diff --stat ${wt1.branch}...${wt2.branch}`, {
        cwd,
        encoding: 'utf8'
      })
      console.log('📊 Diff Stats\n')
      console.log(stat)
    } else if (opts.files) {
      // List changed files
      const files = execSync(`git diff --name-only ${wt1.branch}...${wt2.branch}`, {
        cwd,
        encoding: 'utf8'
      }).trim()

      console.log('📁 Changed Files\n')
      if (files) {
        for (const file of files.split('\n')) {
          console.log(`  ${file}`)
        }
      } else {
        console.log('  No differences found.')
      }
    } else {
      // Default: show summary
      const stat = execSync(`git diff --shortstat ${wt1.branch}...${wt2.branch}`, {
        cwd,
        encoding: 'utf8'
      }).trim()

      const commits1 = countCommits(cwd, wt1.branch)
      const commits2 = countCommits(cwd, wt2.branch)

      console.log('📈 Summary')
      console.log('')
      console.log(`  ${wt1.branch}: ${commits1} commit(s)`)
      console.log(`  ${wt2.branch}: ${commits2} commit(s)`)
      console.log('')
      
      if (stat) {
        console.log(`  ${stat}`)
      } else {
        console.log('  Identical content.')
      }

      console.log('')
      console.log('Commands:')
      console.log(`  peek compare ${worktree1} ${worktree2} --stat   # detailed stats`)
      console.log(`  peek compare ${worktree1} ${worktree2} --files  # list files`)
      console.log(`  peek switch ${worktree1}                        # view ${wt1.branch}`)
      console.log(`  peek switch ${worktree2}                        # view ${wt2.branch}`)
    }
  } catch (e) {
    const err = e as Error & { stderr?: string }
    console.error(`❌ ${err.stderr ?? err.message}`)
    process.exit(1)
  }
}

/**
 * Show leaderboard of active agent worktrees
 */
export async function leaderboardCmd(): Promise<void> {
  const cwd = process.cwd()
  const worktrees = listWorktrees(cwd)
  const metrics = loadMetrics()

  // Filter to agent worktrees only
  const agents = worktrees.filter(w => 
    w.branch.startsWith('agent/') || 
    w.branch.startsWith('peek-') ||
    w.path.includes('/tmp/peek/')
  )

  if (agents.length === 0) {
    console.log('No active agent sessions.')
    console.log('\nStart a session:')
    console.log('  peek start my-feature')
    return
  }

  console.log('\n🏆 Agent Leaderboard\n')

  // Gather stats for each agent
  const stats = agents.map(agent => {
    const session = metrics.sessions.find(s => 
      s.worktreePath === agent.path && !s.endedAt
    )

    let commits = 0
    let linesChanged = 0

    try {
      const mainBranch = worktrees.find(w => w.isMain)?.branch ?? 'main'
      
      commits = parseInt(
        execSync(`git rev-list --count ${mainBranch}..${agent.branch}`, {
          cwd,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim() || '0',
        10
      )

      const shortstat = execSync(`git diff --shortstat ${mainBranch}...${agent.branch}`, {
        cwd,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      }).trim()

      const match = shortstat.match(/(\d+) insertion.*?(\d+) deletion/)
      if (match) {
        linesChanged = parseInt(match[1]!, 10) + parseInt(match[2]!, 10)
      }
    } catch {
      // Stats unavailable
    }

    const duration = session
      ? Date.now() - session.startedAt
      : 0

    return {
      ...agent,
      commits,
      linesChanged,
      duration,
      switches: session?.switches ?? 0
    }
  })

  // Sort by commits (descending)
  stats.sort((a, b) => b.commits - a.commits)

  // Display
  for (let i = 0; i < stats.length; i++) {
    const agent = stats[i]!
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '
    const name = agent.branch.replace(/^agent\//, '').replace(/^peek-/, '')

    console.log(`${medal} ${name}`)
    console.log(`   Commits: ${agent.commits}  Lines: ${agent.linesChanged}`)
    if (agent.duration > 0) {
      console.log(`   Active: ${formatDuration(agent.duration)}`)
    }
    console.log('')
  }

  console.log('Commands:')
  console.log('  peek compare <agent1> <agent2>  # compare two agents')
  console.log('  peek switch <agent>             # view agent')
  console.log('  peek save                       # merge winner')
}

function resolveWorktree(
  query: string,
  worktrees: ReturnType<typeof listWorktrees>
) {
  // Exact branch match
  const exact = worktrees.find(w => w.branch === query)
  if (exact) return exact

  // With agent/ prefix
  const withPrefix = worktrees.find(w => w.branch === `agent/${query}`)
  if (withPrefix) return withPrefix

  // Path match
  const pathMatch = worktrees.find(w => w.path.endsWith(`/${query}`))
  if (pathMatch) return pathMatch

  // Partial match
  const partial = worktrees.find(w => 
    w.branch.toLowerCase().includes(query.toLowerCase())
  )
  return partial
}

function countCommits(cwd: string, branch: string): number {
  try {
    const output = execSync(`git rev-list --count HEAD ^origin/HEAD 2>/dev/null || echo "0"`, {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()
    return parseInt(output, 10) || 0
  } catch {
    return 0
  }
}

function formatDuration(ms: number): string {
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(0)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}

