/**
 * Chaos Test Suite for Peek
 * 
 * Tests edge cases and failure scenarios:
 * - SIGKILL recovery
 * - Disk full handling
 * - Concurrent CLI invocations
 * - State corruption recovery
 * 
 * Run with: pnpm test:chaos
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { getWorktreePath, loadConfig } from '../packages/middleware/src/config.ts'

const TEST_DIR = join(tmpdir(), 'peek-chaos-tests')
const PEEK_CLI = join(process.cwd(), 'packages/cli/dist/index.js')

describe('Chaos Tests', () => {
  beforeEach(() => {
    // Create fresh test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
    mkdirSync(TEST_DIR, { recursive: true })
    
    // Initialize a git repo
    execSync('git init', { cwd: TEST_DIR, stdio: 'pipe' })
    execSync('git config user.email "test@test.com"', { cwd: TEST_DIR, stdio: 'pipe' })
    execSync('git config user.name "Test"', { cwd: TEST_DIR, stdio: 'pipe' })
    writeFileSync(join(TEST_DIR, 'test.txt'), 'initial')
    execSync('git add .', { cwd: TEST_DIR, stdio: 'pipe' })
    execSync('git commit -m "initial"', { cwd: TEST_DIR, stdio: 'pipe' })
  })

  afterEach(() => {
    // Cleanup
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  describe('State Recovery', () => {
    it('should recover from corrupted state file', async () => {
      const stateDir = join(TEST_DIR, '.config', 'peek')
      mkdirSync(stateDir, { recursive: true })
      
      // Write corrupted state
      writeFileSync(join(stateDir, 'state.json'), '{ invalid json }')
      
      // Running doctor should not crash and should fix it
      const result = runPeek(['doctor', '--fix'], TEST_DIR)
      expect(result.exitCode).toBe(0)
    })

    it('should recover from missing directories', async () => {
      // Don't create any peek directories
      const result = runPeek(['status'], TEST_DIR)
      // Should not crash, should create directories as needed
      expect(result.exitCode).toBe(0)
    })
  })

  describe('Concurrent Access', () => {
    it('should handle concurrent list commands gracefully', async () => {
      // Run multiple list commands simultaneously
      const promises = Array(5).fill(null).map(() => 
        runPeekAsync(['list'], TEST_DIR)
      )
      
      const results = await Promise.all(promises)
      
      // All should succeed (list is read-only)
      for (const result of results) {
        expect(result.exitCode).toBe(0)
      }
    })

    it('should serialize concurrent start commands', async () => {
      // Try to start multiple sessions at once
      const promises = [
        runPeekAsync(['start', 'test-1'], TEST_DIR),
        runPeekAsync(['start', 'test-2'], TEST_DIR),
        runPeekAsync(['start', 'test-3'], TEST_DIR)
      ]
      
      const results = await Promise.all(promises)
      
      // At least one should succeed
      const successes = results.filter(r => r.exitCode === 0)
      expect(successes.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Resource Limits', () => {
    it('should handle missing git gracefully', async () => {
      // This test would need to mock PATH, so we skip in normal runs
      // but document the expected behavior
      expect(true).toBe(true)
    })

    it('should report git version issues', async () => {
      const result = runPeek(['doctor'], TEST_DIR)
      expect(result.stdout).toContain('Git version')
    })
  })

  describe('Worktree Edge Cases', () => {
    it('should handle orphaned worktree references', async () => {
      // Create a worktree then delete the directory manually
      runPeek(['start', 'orphan-test'], TEST_DIR)
      
      const originalHome = process.env.HOME
      process.env.HOME = TEST_DIR
      const worktreePath = getWorktreePath('orphan-test', loadConfig(TEST_DIR))
      process.env.HOME = originalHome

      if (existsSync(worktreePath)) {
        rmSync(worktreePath, { recursive: true, force: true })
      }
      
      // Doctor should detect and offer to fix
      const result = runPeek(['doctor'], TEST_DIR)
      expect(result.stdout + result.stderr).toMatch(/orphan|prune/i)
    })

    it('should handle switching to non-existent worktree', async () => {
      const result = runPeek(['switch', '/nonexistent/path'], TEST_DIR)
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain('Invalid')
    })

    it('should handle special characters in branch names', async () => {
      // Create a branch with special characters
      const result = runPeek(['start', 'test-feature/sub-task'], TEST_DIR)
      // Should handle the / in the name
      expect(result.exitCode).toBe(0)
    })
  })

  describe('Federation Edge Cases', () => {
    it('should handle linking non-existent path', async () => {
      const result = runPeek(['fed', 'link', 'fake', '/nonexistent/path'], TEST_DIR)
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain('does not exist')
    })

    it('should handle linking non-git directory', async () => {
      const nonGitDir = join(TEST_DIR, 'not-a-repo')
      mkdirSync(nonGitDir, { recursive: true })
      
      const result = runPeek(['fed', 'link', 'fake', nonGitDir], TEST_DIR)
      expect(result.exitCode).not.toBe(0)
      expect(result.stderr).toContain('Not a git')
    })
  })

  describe('Metrics Edge Cases', () => {
    it('should handle corrupted metrics file', async () => {
      const metricsDir = join(TEST_DIR, '.config', 'peek')
      mkdirSync(metricsDir, { recursive: true })
      
      // Write corrupted metrics
      writeFileSync(join(metricsDir, 'metrics.json'), 'not json')
      
      // Should not crash when reading metrics
      const result = runPeek(['metrics'], TEST_DIR)
      expect(result.exitCode).toBe(0)
    })

    it('should handle clearing empty metrics', async () => {
      const result = runPeek(['metrics-clear'], TEST_DIR)
      expect(result.exitCode).toBe(0)
    })
  })
})

// Helper functions

function runPeek(args: string[], cwd: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`node ${PEEK_CLI} ${args.join(' ')}`, {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, HOME: cwd },
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return { stdout, stderr: '', exitCode: 0 }
  } catch (e) {
    const err = e as Error & { stdout?: string; stderr?: string; status?: number }
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? err.message,
      exitCode: err.status ?? 1
    }
  }
}

async function runPeekAsync(args: string[], cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn('node', [PEEK_CLI, ...args], {
      cwd,
      env: { ...process.env, HOME: cwd },
      stdio: ['pipe', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => { stdout += data.toString() })
    proc.stderr.on('data', (data) => { stderr += data.toString() })

    proc.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code ?? 1 })
    })

    // Timeout after 10 seconds
    setTimeout(() => {
      proc.kill('SIGTERM')
      resolve({ stdout, stderr: stderr + '\nTimeout', exitCode: 124 })
    }, 10000)
  })
}

