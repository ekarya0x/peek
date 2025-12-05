import { EventEmitter } from 'node:events'
import { join, resolve } from 'node:path'
import type { PeekState, SwitchEvent, PeekOptions, WorktreeInfo } from './types.js'
import { isValidWorktree, getWorktreeInfo, listWorktrees } from './worktree.js'

export class PeekCore extends EventEmitter {
  private state: PeekState
  private historyLimit: number

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

  async switch(target: string): Promise<{ success: boolean; error?: string }> {
    const resolved = this.resolve(target)

    if (!isValidWorktree(resolved)) {
      return { success: false, error: `Invalid worktree: ${resolved}` }
    }

    const info = getWorktreeInfo(resolved, this.state.main)

    this.state.previous = this.state.current
    this.state.current = resolved
    this.state.history.push(resolved)

    if (this.state.history.length > this.historyLimit) {
      this.state.history = this.state.history.slice(-this.historyLimit)
    }

    const event: SwitchEvent = {
      from: this.state.previous,
      to: resolved,
      info
    }

    this.emit('switch', event)
    return { success: true }
  }

  async switchLast(): Promise<{ success: boolean; error?: string }> {
    if (!this.state.previous) {
      return { success: false, error: 'No previous worktree' }
    }
    return this.switch(this.state.previous)
  }

  async switchMain(): Promise<{ success: boolean; error?: string }> {
    return this.switch(this.state.main)
  }

  getState(): PeekState {
    return { ...this.state }
  }

  getCurrent(): string {
    return this.state.current
  }

  getMain(): string {
    return this.state.main
  }

  isMain(): boolean {
    return this.state.current === this.state.main
  }

  list(): WorktreeInfo[] {
    return listWorktrees(this.state.main)
  }

  private resolve(target: string): string {
    if (target === '.') return this.state.main
    if (target === '-') return this.state.previous ?? this.state.main
    if (target.startsWith('/')) return target
    if (target.startsWith('~')) return target.replace('~', process.env['HOME'] ?? '')

    const worktrees = this.list()
    const match = worktrees.find(w => 
      w.branch === target || 
      w.path.endsWith(`/${target}`) ||
      w.path === target
    )
    if (match) return match.path

    return resolve(process.cwd(), target)
  }
}

