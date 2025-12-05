import { describe, it, expect, vi } from 'vitest'

vi.mock('node:child_process', () => ({
  execSync: vi.fn((cmd: string) => {
    if (cmd.includes('rev-parse --abbrev-ref')) return 'main\n'
    if (cmd.includes('rev-parse --short')) return 'abc1234\n'
    if (cmd.includes('status --short')) return 'M  src/index.ts\n'
    return ''
  })
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn((path: string) => {
    const exists = [
      '/test',
      '/test/package.json',
      '/test/src',
      '/test/src/index.ts'
    ]
    return exists.includes(path)
  }),
  readFileSync: vi.fn((path: string) => {
    if (path.includes('package.json')) {
      return JSON.stringify({ name: 'test-project' })
    }
    return 'export default {}'
  }),
  readdirSync: vi.fn((dir: string) => {
    if (dir === '/test') return ['src', 'package.json']
    if (dir === '/test/src') return ['index.ts']
    return []
  }),
  statSync: vi.fn((path: string) => ({
    isDirectory: () => path.includes('src') && !path.includes('.'),
    size: 100
  }))
}))

describe('scope generation', () => {
  it('generates valid markdown output', async () => {
    const { scopeCmd } = await import('./scope.js')
    
    const logs: string[] = []
    const originalLog = console.log
    console.log = (...args: unknown[]) => logs.push(args.join(' '))
    
    await scopeCmd('/test', { output: true })
    
    console.log = originalLog
    
    const output = logs.join('\n')
    expect(output).toContain('# Worktree Context')
    expect(output).toContain('Path: /test')
    expect(output).toContain('Branch: main')
  })
})

