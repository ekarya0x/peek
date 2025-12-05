export { PeekCore } from './core.js'
export { 
  listWorktrees, 
  createWorktree, 
  removeWorktree, 
  isValidWorktree, 
  getWorktreeInfo,
  isWorktreeLocked,
  pruneWorktrees,
  branchExists,
  getMainRepoPath
} from './worktree.js'
export type { PeekState, WorktreeInfo, SwitchEvent, PeekOptions } from './types.js'

