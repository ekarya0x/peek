import { PeekCore } from '@ekarya0x/middleware'

export async function statusCmd(): Promise<void> {
  const core = new PeekCore()
  const state = core.getState()
  const worktrees = core.list()

  console.log('peek status\n')
  console.log(`Current: ${state.current}`)
  console.log(`Main:    ${state.main}`)
  
  if (state.previous) {
    console.log(`Previous: ${state.previous}`)
  }

  console.log(`\nWorktrees: ${worktrees.length}`)
  
  for (const wt of worktrees.slice(0, 5)) {
    const marker = wt.path === state.current ? '>' : ' '
    console.log(`${marker} ${wt.branch} (${wt.path})`)
  }

  if (worktrees.length > 5) {
    console.log(`  ... and ${worktrees.length - 5} more`)
  }
}

