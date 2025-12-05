import { EventEmitter } from 'node:events'
import { join, resolve } from 'node:path'
import type { PeekState, SwitchEvent, PeekOptions, WorktreeInfo } from './types.js'
import { isValidWorktree, getWorktreeInfo, listWorktrees } from './worktree.js'

export class PeekCore extends EventEmitter {
  private state: PeekState
  private historyLimit: number
  private switching: boolean = false

  constructor(opts: PeekOptions = {}) {
    super()
    const mainPath = opts.mainPath ?? process.cwd()
    this.historyLimit = opts.historyLimit ?? 50
    this.state = {
      current: mainPath,
      previous: null,
      main: mainPath,
      history: [mainPath]
    }
  }

  /**
   * Switch to a worktree by path, branch name, or alias
   * 
   * @param target - Path, branch name, ".", or "-"
   * @returns Success status and optional error
   */
  async switch(target: string): Promise<{ success: boolean; error?: string }> {
    // Prevent concurrent switches
    if (this.switching) {
      return { success: false, error: 'Switch already in progress' }
    }

    this.switching = true

    try {
      const resolved = this.resolve(target)

      // Validate the resolved path
      if (!resolved) {
        return { success: false, error: `Could not resolve target: ${target}` }
      }

      // Check if already on this worktree
      if (resolved === this.state.current) {
        return { success: true } // Already there, no-op success
      }

      // Validate the worktree exists
      if (!isValidWorktree(resolved)) {
        return { success: false, error: `Invalid worktree: ${resolved}` }
      }

      const info = getWorktreeInfo(resolved, this.state.main)

      // Update state atomically
      const previousState = { ...this.state }
      
      this.state.previous = this.state.current
      this.state.current = resolved
      
      // Add to history (avoiding duplicates at the end)
      if (this.state.history[this.state.history.length - 1] !== resolved) {
        this.state.history.push(resolved)
      }

      // Trim history if needed
      if (this.state.history.length > this.historyLimit) {
        this.state.history = this.state.history.slice(-this.historyLimit)
      }

      const event: SwitchEvent = {
        from: previousState.current,
        to: resolved,
        info
      }

      this.emit('switch', event)
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during switch' 
      }
    } finally {
      this.switching = false
    }
  }

  /**
   * Switch to the previous worktree (like `cd -`)
   */
  async switchLast(): Promise<{ success: boolean; error?: string }> {
    if (!this.state.previous) {
      return { success: false, error: 'No previous worktree in history' }
    }
    
    // Verify previous still exists
    if (!isValidWorktree(this.state.previous)) {
      // Try to find another valid history entry
      const validHistory = this.state.history
        .filter(p => p !== this.state.current && isValidWorktree(p))
        .reverse()
      
      if (validHistory.length > 0) {
        return this.switch(validHistory[0]!)
      }
      
      return { success: false, error: 'Previous worktree no longer exists' }
    }
    
    return this.switch(this.state.previous)
  }

  /**
   * Switch back to the main worktree
   */
  async switchMain(): Promise<{ success: boolean; error?: string }> {
    return this.switch(this.state.main)
  }

  /**
   * Get current state (immutable copy)
   */
  getState(): PeekState {
    return { 
      ...this.state,
      history: [...this.state.history]
    }
  }

  /**
   * Get current worktree path
   */
  getCurrent(): string {
    return this.state.current
  }

  /**
   * Get main worktree path
   */
  getMain(): string {
    return this.state.main
  }

  /**
   * Check if currently on main worktree
   */
  isMain(): boolean {
    return this.state.current === this.state.main
  }

  /**
   * List all available worktrees
   */
  list(): WorktreeInfo[] {
    return listWorktrees(this.state.main)
  }

  /**
   * Find a worktree by partial match (branch name, path suffix, etc.)
   */
  find(query: string): WorktreeInfo | undefined {
    const worktrees = this.list()
    
    // Exact branch match
    const exactBranch = worktrees.find(w => w.branch === query)
    if (exactBranch) return exactBranch

    // Branch name with agent/ prefix
    const agentBranch = worktrees.find(w => w.branch === `agent/${query}`)
    if (agentBranch) return agentBranch
    
    // Path ends with query
    const pathMatch = worktrees.find(w => w.path.endsWith(`/${query}`))
    if (pathMatch) return pathMatch
    
    // Partial branch match (contains)
    const partialBranch = worktrees.find(w => 
      w.branch.toLowerCase().includes(query.toLowerCase())
    )
    if (partialBranch) return partialBranch

    return undefined
  }

  /**
   * Get history of visited worktrees (most recent first)
   */
  getHistory(): string[] {
    return [...this.state.history].reverse()
  }

  /**
   * Clear invalid entries from history
   */
  pruneHistory(): number {
    const before = this.state.history.length
    this.state.history = this.state.history.filter(isValidWorktree)
    return before - this.state.history.length
  }

  /**
   * Resolve a target string to an absolute path
   */
  private resolve(target: string): string {
    // Special aliases
    if (target === '.') return this.state.main
    if (target === '-') return this.state.previous ?? this.state.main

    // Absolute path
    if (target.startsWith('/')) return target
    
    // Home expansion
    if (target.startsWith('~')) {
      return target.replace('~', process.env['HOME'] ?? '')
    }

    // Try to find a matching worktree
    const match = this.find(target)
    if (match) return match.path

    // Relative path resolution
    return resolve(process.cwd(), target)
  }
}
