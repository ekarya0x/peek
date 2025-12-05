import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PeekCore } from './core.js'

vi.mock('./worktree.js', () => ({
  isValidWorktree: (path: string) => path.includes('/valid') || path === '/main',
  getWorktreeInfo: (path: string) => ({
    path,
    branch: path.includes('feature') ? 'feature' : 'main',
    commit: 'abc1234',
    isMain: path === '/main',
    isBare: false
  }),
  listWorktrees: () => [
    { path: '/main', branch: 'main', commit: 'abc1234', isMain: true, isBare: false },
    { path: '/valid/feature', branch: 'feature', commit: 'def5678', isMain: false, isBare: false }
  ]
}))

describe('PeekCore', () => {
  let core: PeekCore

  beforeEach(() => {
    core = new PeekCore({ mainPath: '/main' })
  })

  it('initializes with main path', () => {
    const state = core.getState()
    expect(state.current).toBe('/main')
    expect(state.main).toBe('/main')
    expect(state.previous).toBeNull()
  })

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

  it('switches to last worktree', async () => {
    await core.switch('/valid/feature')
    await core.switchLast()
    expect(core.getCurrent()).toBe('/main')
  })

  it('switchLast fails with no history', async () => {
    const result = await core.switchLast()
    expect(result.success).toBe(false)
  })

  it('switchMain returns to main', async () => {
    await core.switch('/valid/feature')
    await core.switchMain()
    expect(core.getCurrent()).toBe('/main')
  })

  it('isMain returns correct value', async () => {
    expect(core.isMain()).toBe(true)
    await core.switch('/valid/feature')
    expect(core.isMain()).toBe(false)
  })

  it('emits switch event', async () => {
    const handler = vi.fn()
    core.on('switch', handler)
    
    await core.switch('/valid/feature')
    
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      from: '/main',
      to: '/valid/feature'
    }))
  })

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

  it('limits history size', async () => {
    const smallCore = new PeekCore({ mainPath: '/main', historyLimit: 3 })
    
    await smallCore.switch('/valid/feature')
    await smallCore.switch('/main')
    await smallCore.switch('/valid/feature')
    await smallCore.switch('/main')
    
    expect(smallCore.getState().history.length).toBeLessThanOrEqual(3)
  })
})

