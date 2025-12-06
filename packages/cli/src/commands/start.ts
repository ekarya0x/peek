import { existsSync, mkdirSync } from 'node:fs'
import { 
  createWorktree, 
  listWorktrees, 
  loadConfig,
  generateWorktreeName,
  getWorktreePath,
  startSession,
  startTimer
} from '@ekarya0x/middleware'
import { switchCmd } from './switch.js'

interface StartOptions {
  base?: string
  port?: string
  at?: string
}

/**
 * Start a new isolated worktree session.
 * Names are slugged using config settings.
 */
export async function startCmd(target: string, opts: StartOptions): Promise<void> {
  const timer = startTimer()
  const config = loadConfig()
  const port = opts.port || process.env.PEEK_PORT || String(config.port)
  
  const branch = generateWorktreeName(target, config)
  const worktreePath = opts.at ?? getWorktreePath(target, config)

  // Check if worktree already exists
  const worktrees = listWorktrees(process.cwd())
  const existing = worktrees.find(w => 
    w.branch === branch || 
    w.path === worktreePath ||
    w.path.endsWith(`/${branch}`) ||
    w.path.endsWith(`/${worktreePath.split('/').pop()}`)
  )

  if (existing) {
    console.log(`\n🔄 Session already exists: ${existing.branch}`)
    console.log(`   Switching to existing worktree...`)
    await switchCmd(existing.path, port)
    return
  }

  // Ensure worktree directory exists
  const peekDir = config.worktreeDir
  if (!existsSync(peekDir)) {
    mkdirSync(peekDir, { recursive: true })
  }

  console.log(`\n🚀 Starting agent session: ${branch}`)
  console.log(`   Worktree: ${worktreePath}`)
  if (opts.base && opts.base !== 'HEAD') {
    console.log(`   Base: ${opts.base}`)
  }
  console.log('')

  const result = createWorktree({
    cwd: process.cwd(),
    branch,
    path: worktreePath,
    base: opts.base ?? 'HEAD'
  })

  if (!result.success) {
    console.error(`❌ Failed to create worktree: ${result.error}`)
    process.exit(1)
  }

  // Record session start
  startSession(worktreePath, branch)

  console.log(`✓ Worktree created`)
  console.log(`✓ Switching dev server...`)
  
  await switchCmd(worktreePath, port)

  const duration = timer.format()

  console.log('')
  console.log(`✅ Agent session ready! (${duration})`)
  console.log(``)
  console.log(`  peek scope      # copy context for your agent`)
  console.log(`  peek save       # merge and keep changes`)
  console.log(`  peek discard    # abandon changes`)
  console.log(`  peek .          # back to main (keeps worktree)`)
  console.log(`  peek -          # toggle between sessions`)
}
