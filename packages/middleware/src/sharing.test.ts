import { describe, it, expect, vi, beforeEach } from 'vitest'

const fsMocks = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  symlinkSync: vi.fn(),
  cpSync: vi.fn(),
  linkSync: vi.fn(),
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  mkdirSync: vi.fn(),
  mkdtempSync: vi.fn(() => '/tmp/peek-test'),
  writeFileSync: vi.fn()
}))

vi.mock('node:child_process', () => ({
  execSync: vi.fn()
}))

import * as cp from 'node:child_process'

vi.mock('node:fs', () => fsMocks)

import { applyShareRules, loadShareRules } from './sharing.js'

describe('sharing', () => {
  beforeEach(() => {
    Object.values(fsMocks).forEach(fn => fn.mockReset?.())
    vi.mocked(cp.execSync).mockReset()
  })

  it('skips node_modules when lockfile mismatch detected', () => {
    fsMocks.existsSync.mockImplementation((p: string) => {
      if (p.endsWith('.peekignore')) return false
      if (p.includes('pnpm-lock.yaml')) return true
      return true
    })
    fsMocks.readFileSync.mockImplementation((p: string) => {
      if (p.startsWith('/main') && p.includes('pnpm-lock.yaml')) return 'a'
      if (p.startsWith('/wt') && p.includes('pnpm-lock.yaml')) return 'b'
      return ''
    })
    vi.mocked(cp.execSync).mockImplementation(() => '')

    const rules = loadShareRules('/main')
    const result = applyShareRules('/main', '/wt', rules)

    expect(result.errors.find((e: string) => e.includes('node_modules'))).toBeTruthy()
  })

  it('returns error when reflink unsupported', () => {
    fsMocks.existsSync.mockReturnValue(true)
    fsMocks.readFileSync.mockReturnValue('')
    vi.mocked(cp.execSync).mockImplementation(() => {
      throw new Error('reflink not supported')
    })
    const rules = [{ pattern: 'node_modules', strategy: 'reflink' } as const]
    const res = applyShareRules('/main', '/wt', rules)
    expect(res.errors.length).toBe(1)
  })
})
