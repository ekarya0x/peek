import { listWorktrees, getMetadata, formatMetadata } from '@peektree/middleware'

const NATIVE = process.env.PEEK_NATIVE === '1'

export async function listCmd(): Promise<void> {
  const worktrees = listWorktrees(process.cwd())

  if (worktrees.length === 0) {
    console.log('No worktrees. Run: peek s <name>')
    return
  }

  console.log('')
  
  for (const wt of worktrees) {
    const marker = wt.isMain ? '●' : '○'
    const branch = wt.branch === 'detached' ? `(${wt.commit})` : wt.branch
    
    let meta = ''
    if (!wt.isMain && NATIVE) {
      const data = getMetadata(wt.path)
      if (data) {
        meta = `  (${formatMetadata(data)})`
      }
    }

    console.log(`  ${marker} ${branch}${meta}`)
  }
  
  console.log('')
}
