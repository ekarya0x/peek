import { 
  PeekCore, 
  startTimer,
  listStashes, 
  getStash, 
  applyStash, 
  dropStash, 
  pruneStashes 
} from '@ekarya0x/middleware'

interface RecoverOptions {
  apply?: string
  drop?: string
  prune?: boolean
  all?: boolean
}

/**
 * Recover stashed changes from discarded sessions
 * 
 * Usage:
 *   peek recover                    - List recoverable stashes
 *   peek recover --apply <id>       - Apply stash to current worktree
 *   peek recover --drop <id>        - Delete a stash permanently
 *   peek recover --prune            - Remove stashes older than 7 days
 */
export async function recoverCmd(opts: RecoverOptions): Promise<void> {
  const timer = startTimer()

  // Prune old stashes
  if (opts.prune) {
    const removed = pruneStashes()
    console.log(`Removed ${removed} stash(es) older than 7 days.`)
    return
  }

  // Drop specific stash
  if (opts.drop) {
    const success = dropStash(opts.drop)
    if (success) {
      console.log(`Dropped stash: ${opts.drop}`)
    } else {
      console.error(`Stash not found: ${opts.drop}`)
      process.exit(1)
    }
    return
  }

  // Apply specific stash
  if (opts.apply) {
    const core = new PeekCore()
    const current = core.getCurrent()
    const stash = getStash(opts.apply)

    if (!stash) {
      console.error(`Stash not found: ${opts.apply}`)
      process.exit(1)
    }

    console.log(`\nApplying stash from: ${stash.branch}`)
    console.log(`  ${stash.files} file(s), ${formatAge(stash.timestamp)} ago`)
    console.log('')

    const success = applyStash(opts.apply, current)
    if (success) {
      console.log(`✅ Stash applied to ${current}`)
      if (!opts.all) {
        dropStash(opts.apply)
        console.log(`   (Stash removed after apply)`)
      }
    } else {
      console.error(`❌ Failed to apply stash. Try applying manually:`)
      console.error(`   git stash show -p ${stash.gitStashRef} | git apply`)
      process.exit(1)
    }
    return
  }

  // List all stashes
  const stashes = listStashes()

  if (stashes.length === 0) {
    console.log('\nNo recoverable stashes found.')
    console.log('')
    console.log('Stashes are created automatically when you run `peek discard`')
    console.log('on a worktree with uncommitted changes.')
    return
  }

  console.log('\n📦 Recoverable Stashes\n')
  console.log('ID                          Branch                Files  Age')
  console.log('─'.repeat(70))

  for (const stash of stashes) {
    const id = stash.id.padEnd(26)
    const branch = stash.branch.slice(0, 20).padEnd(20)
    const files = String(stash.files).padStart(5)
    const age = formatAge(stash.timestamp).padStart(10)
    console.log(`${id}  ${branch}  ${files}  ${age}`)
  }

  console.log('')
  console.log('Commands:')
  console.log('  peek recover --apply <id>   Apply stash to current worktree')
  console.log('  peek recover --drop <id>    Delete stash permanently')
  console.log('  peek recover --prune        Remove stashes > 7 days old')
}

function formatAge(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

