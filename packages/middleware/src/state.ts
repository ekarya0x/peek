import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

export type TransactionType = 'switch' | 'mount' | 'unmount' | 'create' | 'remove'
export type TransactionStatus = 'pending' | 'committed' | 'rolled_back'

export interface Transaction {
  id: string
  type: TransactionType
  target: string
  timestamp: number
  status: TransactionStatus
  rollbackData?: {
    previousPath?: string
    createdPath?: string
    branch?: string
  }
}

export interface PeekRuntimeState {
  currentWorktree: string
  mainWorktree: string
  status: 'idle' | 'switching' | 'mounting' | 'unmounting'
  activeTransaction: string | null
}

const STATE_DIR = join(homedir(), '.config', 'peek')
const WAL_FILE = join(STATE_DIR, 'wal.json')
const STATE_FILE = join(STATE_DIR, 'state.json')

/**
 * Write-Ahead Log for crash recovery
 * All state changes log intent BEFORE execution
 */
export class TransactionLog {
  private transactions: Transaction[] = []

  constructor() {
    this.load()
  }

  private load(): void {
    if (!existsSync(WAL_FILE)) {
      this.transactions = []
      return
    }

    try {
      this.transactions = JSON.parse(readFileSync(WAL_FILE, 'utf8'))
    } catch {
      this.transactions = []
    }
  }

  private persist(): void {
    ensureDir(STATE_DIR)
    const temp = `${WAL_FILE}.tmp`
    writeFileSync(temp, JSON.stringify(this.transactions, null, 2))
    renameSync(temp, WAL_FILE)
  }

  begin(type: TransactionType, target: string, rollbackData?: Transaction['rollbackData']): string {
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    
    this.transactions.push({
      id,
      type,
      target,
      timestamp: Date.now(),
      status: 'pending',
      rollbackData
    })
    
    this.persist()
    return id
  }

  commit(id: string): void {
    const tx = this.transactions.find(t => t.id === id)
    if (tx) {
      tx.status = 'committed'
      this.persist()
    }
  }

  rollback(id: string): void {
    const tx = this.transactions.find(t => t.id === id)
    if (tx) {
      tx.status = 'rolled_back'
      this.persist()
    }
  }

  getPending(): Transaction[] {
    return this.transactions.filter(t => t.status === 'pending')
  }

  getRecent(limit: number = 10): Transaction[] {
    return this.transactions.slice(-limit)
  }

  prune(maxAge: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAge
    const before = this.transactions.length
    this.transactions = this.transactions.filter(
      t => t.timestamp > cutoff || t.status === 'pending'
    )
    this.persist()
    return before - this.transactions.length
  }

  clear(): void {
    this.transactions = []
    if (existsSync(WAL_FILE)) {
      unlinkSync(WAL_FILE)
    }
  }
}

/**
 * Persistent state manager with crash recovery
 */
export class StateManager {
  private state: PeekRuntimeState
  private wal: TransactionLog

  constructor(mainWorktree: string = process.cwd()) {
    this.wal = new TransactionLog()
    this.state = this.loadState(mainWorktree)
  }

  private loadState(mainWorktree: string): PeekRuntimeState {
    const defaults: PeekRuntimeState = {
      currentWorktree: mainWorktree,
      mainWorktree,
      status: 'idle',
      activeTransaction: null
    }

    if (!existsSync(STATE_FILE)) {
      return defaults
    }

    try {
      const saved = JSON.parse(readFileSync(STATE_FILE, 'utf8'))
      return { ...defaults, ...saved, mainWorktree }
    } catch {
      return defaults
    }
  }

  private persistState(): void {
    ensureDir(STATE_DIR)
    const temp = `${STATE_FILE}.tmp`
    writeFileSync(temp, JSON.stringify(this.state, null, 2))
    renameSync(temp, STATE_FILE)
  }

  /**
   * Check for crashed transactions and recover
   */
  async recover(): Promise<RecoveryResult> {
    const pending = this.wal.getPending()
    const recovered: string[] = []
    const failed: string[] = []

    for (const tx of pending) {
      try {
        await this.rollbackTransaction(tx)
        this.wal.rollback(tx.id)
        recovered.push(tx.id)
      } catch (e) {
        failed.push(tx.id)
      }
    }

    // Reset state to idle
    this.state.status = 'idle'
    this.state.activeTransaction = null
    this.persistState()

    return { recovered, failed, hasPending: pending.length > 0 }
  }

  private async rollbackTransaction(tx: Transaction): Promise<void> {
    switch (tx.type) {
      case 'switch':
        // Switch back to previous path
        if (tx.rollbackData?.previousPath) {
          this.state.currentWorktree = tx.rollbackData.previousPath
        }
        break

      case 'create':
        // Remove created worktree
        if (tx.rollbackData?.createdPath) {
          const { execSync } = await import('node:child_process')
          try {
            execSync(`git worktree remove --force "${tx.rollbackData.createdPath}"`, {
              stdio: 'pipe'
            })
          } catch {
            // May already be removed
          }
        }
        break

      case 'mount':
      case 'unmount':
      case 'remove':
        // These are best-effort rollbacks
        break
    }
  }

  /**
   * Begin a transactional operation
   */
  beginSwitch(target: string): string {
    const txId = this.wal.begin('switch', target, {
      previousPath: this.state.currentWorktree
    })
    this.state.status = 'switching'
    this.state.activeTransaction = txId
    this.persistState()
    return txId
  }

  beginCreate(branch: string, path: string): string {
    const txId = this.wal.begin('create', path, {
      branch,
      createdPath: path
    })
    this.state.status = 'mounting'
    this.state.activeTransaction = txId
    this.persistState()
    return txId
  }

  beginRemove(path: string): string {
    const txId = this.wal.begin('remove', path, {
      previousPath: this.state.currentWorktree
    })
    this.state.status = 'unmounting'
    this.state.activeTransaction = txId
    this.persistState()
    return txId
  }

  /**
   * Complete a transaction successfully
   */
  commitTransaction(txId: string, newCurrentPath?: string): void {
    this.wal.commit(txId)
    
    if (newCurrentPath) {
      this.state.currentWorktree = newCurrentPath
    }
    
    this.state.status = 'idle'
    this.state.activeTransaction = null
    this.persistState()
  }

  /**
   * Abort a transaction
   */
  abortTransaction(txId: string): void {
    this.wal.rollback(txId)
    this.state.status = 'idle'
    this.state.activeTransaction = null
    this.persistState()
  }

  getState(): PeekRuntimeState {
    return { ...this.state }
  }

  getCurrentWorktree(): string {
    return this.state.currentWorktree
  }

  getMainWorktree(): string {
    return this.state.mainWorktree
  }

  isIdle(): boolean {
    return this.state.status === 'idle'
  }

  getWAL(): TransactionLog {
    return this.wal
  }
}

export interface RecoveryResult {
  recovered: string[]
  failed: string[]
  hasPending: boolean
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

// Singleton for shared state
let globalStateManager: StateManager | null = null

export function getStateManager(mainWorktree?: string): StateManager {
  if (!globalStateManager) {
    globalStateManager = new StateManager(mainWorktree)
  }
  return globalStateManager
}

export function resetStateManager(): void {
  globalStateManager = null
}

