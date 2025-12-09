import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockExists = vi.fn()
const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()
const mockMkDir = vi.fn()
const execCalls: Array<{ cmd: string; opts: any }> = []

vi.mock('node:fs', () => ({
  existsSync: (p: string) => mockExists(p),
  readFileSync: (p: string) => mockReadFile(p),
  writeFileSync: (p: string, data: string) => mockWriteFile(p, data),
  mkdirSync: (p: string) => mockMkDir(p)
}))

vi.mock('node:child_process', () => ({
  execSync: (cmd: string, opts?: any) => {
    execCalls.push({ cmd, opts })
    if (cmd.startsWith('git rev-parse --show-toplevel')) return '/main\n'
    if (cmd.startsWith('git stash show -p')) return 'patch'
    return ''
  }
}))

describe('stash lifecycle', () => {
  beforeEach(() => {
    execCalls.length = 0
    mockExists.mockReset()
    mockReadFile.mockReset()
    mockWriteFile.mockReset()
    mockMkDir.mockReset()
  })

  it('applies stash using repoPath fallback when worktree exists', async () => {
    const entry = {
      id: 'stash-1',
      branch: 'agent/test',
      worktreePath: '/wt',
      timestamp: Date.now(),
      message: 'msg',
      files: 1,
      gitStashRef: 'abc'
    }

    mockExists.mockImplementation((p: string) => {
      if (p === '/wt') return true
      if (p.endsWith('index.json')) return true
      return false
    })
    mockReadFile.mockImplementation((p: string) => {
      if (p.endsWith('index.json')) return JSON.stringify([entry])
      return ''
    })

    const { applyStash } = await import('./stash.js')
    const ok = applyStash(entry.id, '/wt')

    expect(ok).toBe(true)
    const applyCall = execCalls.find(c => c.cmd.startsWith('git apply'))
    expect(applyCall?.opts?.cwd).toBe('/main')
  })

  it('drops stash even if repoPath missing by falling back to worktree', async () => {
    const entry = {
      id: 'stash-2',
      branch: 'agent/test',
      worktreePath: '/wt',
      timestamp: Date.now(),
      message: 'msg',
      files: 1,
      gitStashRef: 'def'
    }

    mockExists.mockImplementation((p: string) => {
      if (p === '/wt') return true
      if (p.endsWith('index.json')) return true
      return false
    })
    mockReadFile.mockImplementation((p: string) => {
      if (p.endsWith('index.json')) return JSON.stringify([entry])
      return ''
    })

    const { dropStash } = await import('./stash.js')
    const ok = dropStash(entry.id)

    expect(ok).toBe(true)
    const dropCall = execCalls.find(c => c.cmd.startsWith('git stash drop'))
    expect(dropCall?.opts?.cwd).toBe('/main')
  })
})
