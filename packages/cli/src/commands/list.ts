import { listWorktrees } from '@ekarya0x/middleware'

export async function listCmd(): Promise<void> {
  const worktrees = listWorktrees(process.cwd())

  if (worktrees.length === 0) {
    console.log('No worktrees found. Is this a git repository?')
    return
  }

  console.log('Worktrees:\n')
  
  for (const wt of worktrees) {
    const marker = wt.isMain ? '*' : ' '
    const branch = wt.branch === 'detached' ? `(${wt.commit})` : wt.branch
    console.log(`${marker} ${branch}`)
    console.log(`  ${wt.path}\n`)
  }
}

