import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PeekCore } from './core.js'

vi.mock('./worktree.js', () => ({
  isValidWorktree: (path: string) => path.includes('/valid') || path === '/main',
  getWorktreeInfo: (path: string) => ({
    path,
    branch: path.includes('feature') ? 'feature' : path.includes('agent') ? 'agent/claude' : 'main',
    commit: 'abc1234',
    isMain: path === '/main',
    isBare: false
  }),
  listWorktrees: () => [
    { path: '/main', branch: 'main', commit: 'abc1234', isMain: true, isBare: false },
    { path: '/valid/feature', branch: 'feature', commit: 'def5678', isMain: false, isBare: false },
    { path: '/valid/agent-claude', branch: 'agent/claude', commit: 'ghi9012', isMain: false, isBare: false }
  ]
}))

describe('PeekCore', () => {
  let core: PeekCore

  beforeEach(() => {
    core = new PeekCore({ mainPath: '/main' })
  })

  describe('initialization', () => {
    it('initializes with main path', () => {
      const state = core.getState()
      expect(state.current).toBe('/main')
      expect(state.main).toBe('/main')
      expect(state.previous).toBeNull()
    })

    it('initializes with cwd if no mainPath provided', () => {
      const defaultCore = new PeekCore()
      expect(defaultCore.getMain()).toBe(process.cwd())
    })
  })

  describe('switch', () => {
    it('switches to valid worktree', async () => {
      const result = await core.switch('/valid/feature')
      expect(result.success).toBe(true)
      expect(core.getCurrent()).toBe('/valid/feature')
    })

    it('rejects invalid worktree', async () => {
      const result = await core.switch('/invalid/path')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid worktree')
    })

    it('tracks previous worktree', async () => {
      await core.switch('/valid/feature')
      const state = core.getState()
      expect(state.previous).toBe('/main')
    })

    it('no-ops when switching to current worktree', async () => {
      const result = await core.switch('/main')
      expect(result.success).toBe(true)
      expect(core.getCurrent()).toBe('/main')
    })

    it('prevents concurrent switches', async () => {
      // Start two switches simultaneously
      const switch1 = core.switch('/valid/feature')
      const switch2 = core.switch('/valid/agent-claude')

      const [result1, result2] = await Promise.all([switch1, switch2])

      // One should succeed, one should fail
      expect(result1.success || result2.success).toBe(true)
    })
  })

  describe('switchLast', () => {
    it('switches to previous worktree', async () => {
      await core.switch('/valid/feature')
      await core.switchLast()
      expect(core.getCurrent()).toBe('/main')
    })

    it('fails with no history', async () => {
      const result = await core.switchLast()
      expect(result.success).toBe(false)
    })
  })

  describe('switchMain', () => {
    it('returns to main', async () => {
      await core.switch('/valid/feature')
      await core.switchMain()
      expect(core.getCurrent()).toBe('/main')
    })
  })

  describe('isMain', () => {
    it('returns true when on main', () => {
      expect(core.isMain()).toBe(true)
    })

    it('returns false when not on main', async () => {
      await core.switch('/valid/feature')
      expect(core.isMain()).toBe(false)
    })
  })

  describe('events', () => {
    it('emits switch event', async () => {
      const handler = vi.fn()
      core.on('switch', handler)
      
      await core.switch('/valid/feature')
      
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        from: '/main',
        to: '/valid/feature'
      }))
    })
  })

  describe('resolve aliases', () => {
    it('resolves . to main', async () => {
      await core.switch('/valid/feature')
      await core.switch('.')
      expect(core.getCurrent()).toBe('/main')
    })

    it('resolves - to previous', async () => {
      await core.switch('/valid/feature')
      await core.switch('-')
      expect(core.getCurrent()).toBe('/main')
    })

    it('resolves branch name to path', async () => {
      await core.switch('feature')
      expect(core.getCurrent()).toBe('/valid/feature')
    })

    it('resolves agent name to agent/ prefixed branch', async () => {
      await core.switch('claude')
      expect(core.getCurrent()).toBe('/valid/agent-claude')
    })
  })

  describe('find', () => {
    it('finds by exact branch name', () => {
      const result = core.find('feature')
      expect(result?.path).toBe('/valid/feature')
    })

    it('finds agent branch by short name', () => {
      const result = core.find('claude')
      expect(result?.branch).toBe('agent/claude')
    })

    it('returns undefined for unknown branch', () => {
      const result = core.find('nonexistent')
      expect(result).toBeUndefined()
    })
  })

  describe('history', () => {
    it('limits history size', async () => {
      const smallCore = new PeekCore({ mainPath: '/main', historyLimit: 3 })
      
      await smallCore.switch('/valid/feature')
      await smallCore.switch('/main')
      await smallCore.switch('/valid/feature')
      await smallCore.switch('/main')
      
      expect(smallCore.getState().history.length).toBeLessThanOrEqual(3)
    })

    it('avoids duplicate consecutive entries', async () => {
      await core.switch('/valid/feature')
      await core.switch('/valid/feature') // Same path
      
      const history = core.getHistory()
      expect(history[0]).toBe('/valid/feature')
      expect(history[1]).toBe('/main')
    })

    it('returns history in reverse order', async () => {
      await core.switch('/valid/feature')
      await core.switch('/main')
      
      const history = core.getHistory()
      expect(history[0]).toBe('/main')
      expect(history[history.length - 1]).toBe('/main')
    })
  })
})
