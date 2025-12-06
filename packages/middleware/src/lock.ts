import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const LOCK_DIR = join(homedir(), '.config', 'peek')
const LOCK_FILE = join(LOCK_DIR, '.lock')
const LOCK_TIMEOUT = 5000 // 5 seconds
const STALE_TIMEOUT = 60000 // 1 minute - lock is considered stale

export interface LockInfo {
  pid: number
  timestamp: number
  command: string
  hostname: string
}

export interface LockResult {
  acquired: boolean
  error?: string
  holder?: LockInfo
}

/**
 * Acquire an exclusive lock for peek operations
 * Prevents concurrent CLI invocations from corrupting state
 */
export async function acquireLock(command: string = 'unknown'): Promise<LockResult> {
  ensureLockDir()

  const startTime = Date.now()
  
  while (Date.now() - startTime < LOCK_TIMEOUT) {
    const existing = readLock()
    
    if (!existing) {
      // No lock exists, try to acquire
      if (tryWriteLock(command)) {
        return { acquired: true }
      }
      // Race condition - someone else got it, retry
      await sleep(50)
      continue
    }

    // Check if lock is stale (process died)
    if (isStale(existing)) {
      removeLock()
      continue
    }

    // Check if held by current process (re-entrant)
    if (existing.pid === process.pid) {
      return { acquired: true }
    }

    // Lock held by another process
    await sleep(100)
  }

  // Timeout - return info about who holds the lock
  const holder = readLock()
  return {
    acquired: false,
    error: `Lock held by PID ${holder?.pid}. If the process is dead, run: peek doctor --fix`,
    holder: holder ?? undefined
  }
}

/**
 * Release the lock
 */
export function releaseLock(): void {
  const existing = readLock()
  
  // Only release if we hold it
  if (existing && existing.pid === process.pid) {
    removeLock()
  }
}

/**
 * Force release lock (for doctor --fix)
 */
export function forceReleaseLock(): boolean {
  if (existsSync(LOCK_FILE)) {
    removeLock()
    return true
  }
  return false
}

/**
 * Check if a lock exists and who holds it
 */
export function checkLock(): LockInfo | null {
  return readLock()
}

/**
 * Execute a function while holding the lock
 */
export async function withLock<T>(
  command: string,
  fn: () => Promise<T>
): Promise<T> {
  const result = await acquireLock(command)
  
  if (!result.acquired) {
    throw new PeekLockError(
      result.error ?? 'Could not acquire lock',
      result.holder
    )
  }

  try {
    return await fn()
  } finally {
    releaseLock()
  }
}

export class PeekLockError extends Error {
  constructor(
    message: string,
    public readonly holder?: LockInfo
  ) {
    super(message)
    this.name = 'PeekLockError'
  }
}

// Internal helpers

function ensureLockDir(): void {
  if (!existsSync(LOCK_DIR)) {
    mkdirSync(LOCK_DIR, { recursive: true })
  }
}

function readLock(): LockInfo | null {
  if (!existsSync(LOCK_FILE)) {
    return null
  }

  try {
    return JSON.parse(readFileSync(LOCK_FILE, 'utf8'))
  } catch {
    return null
  }
}

function tryWriteLock(command: string): boolean {
  const info: LockInfo = {
    pid: process.pid,
    timestamp: Date.now(),
    command,
    hostname: require('node:os').hostname()
  }

  try {
    // Use 'wx' flag to fail if file exists (atomic create)
    writeFileSync(LOCK_FILE, JSON.stringify(info, null, 2), { flag: 'wx' })
    return true
  } catch {
    return false
  }
}

function removeLock(): void {
  try {
    unlinkSync(LOCK_FILE)
  } catch {
    // Ignore errors
  }
}

function isStale(info: LockInfo): boolean {
  // Check if process is still running
  try {
    process.kill(info.pid, 0) // Signal 0 just checks if process exists
    
    // Process exists, check if lock is too old
    if (Date.now() - info.timestamp > STALE_TIMEOUT) {
      return true
    }
    
    return false
  } catch {
    // Process doesn't exist, lock is stale
    return true
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

