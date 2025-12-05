import { describe, it, expect, vi, beforeEach } from 'vitest'
import { existsSync, statSync, readFileSync } from 'node:fs'
import { isValidWorktree, listWorktrees } from './worktree.js'

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
  readFileSync: vi.fn()
}))

vi.mock('node:child_process', () => ({
  execSync: vi.fn((cmd: string) => {
    if (cmd.includes('worktree list')) {
      return `worktree /main
HEAD abc1234
branch refs/heads/main

worktree /tmp/feature
HEAD def5678
branch refs/heads/feature

`
    }
    if (cmd.includes('rev-parse --short')) {
      return 'abc1234'
    }
    return ''
  })
}))

describe('isValidWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false if .git does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false)
    expect(isValidWorktree('/some/path')).toBe(false)
  })

  it('returns true for directory .git (main repo)', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(statSync).mockReturnValue({ isDirectory: () => true, isFile: () => false } as any)
    expect(isValidWorktree('/main')).toBe(true)
  })

  it('returns true for file .git (worktree)', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(statSync).mockReturnValue({ isDirectory: () => false, isFile: () => true } as any)
    expect(isValidWorktree('/tmp/worktree')).toBe(true)
  })
})

describe('listWorktrees', () => {
  it('parses git worktree list output', () => {
    const worktrees = listWorktrees('/main')
    
    expect(worktrees).toHaveLength(2)
    expect(worktrees[0]).toEqual({
      path: '/main',
      branch: 'main',
      commit: 'abc1234',
      isMain: true,
      isBare: false
    })
    expect(worktrees[1]).toEqual({
      path: '/tmp/feature',
      branch: 'feature',
      commit: 'def5678',
      isMain: false,
      isBare: false
    })
  })
})

