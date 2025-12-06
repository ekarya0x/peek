/**
 * Structured error types with actionable suggestions
 */

export type ErrorCode =
  | 'PEEK-001' // Git too old
  | 'PEEK-002' // Git version warning
  | 'PEEK-003' // Orphaned worktree
  | 'PEEK-004' // Locked worktree
  | 'PEEK-010' // Lock held
  | 'PEEK-011' // Stale lock
  | 'PEEK-020' // Pending transaction
  | 'PEEK-030' // Missing worktree dir
  | 'PEEK-040' // Low disk
  | 'PEEK-041' // Critical disk
  | 'PEEK-050' // Federation path missing
  | 'PEEK-060' // SSH agent dead
  | 'PEEK-070' // Invalid worktree
  | 'PEEK-080' // Branch conflict
  | 'PEEK-090' // Permission denied

const SUGGESTIONS: Record<ErrorCode, string> = {
  'PEEK-001': 'Upgrade git: `brew install git` or use your package manager',
  'PEEK-002': 'Consider upgrading git for better worktree support',
  'PEEK-003': 'Run `peek doctor --fix` or `git worktree prune`',
  'PEEK-004': 'Run `git worktree unlock <path>` or `peek doctor --fix`',
  'PEEK-010': 'Wait for the other operation to finish, or run `peek doctor --fix`',
  'PEEK-011': 'Run `peek doctor --fix` to clear stale lock',
  'PEEK-020': 'Run `peek doctor --fix` to recover from crash',
  'PEEK-030': 'Run `mkdir -p /tmp/peek` or set PEEK_WORKTREE_DIR',
  'PEEK-040': 'Free disk space or run `peek clean`',
  'PEEK-041': 'Critical: Free disk space immediately',
  'PEEK-050': 'Run `peek fed unlink <name>` or fix the path',
  'PEEK-060': 'Run `ssh-add` to restart SSH agent',
  'PEEK-070': 'Run `peek doctor --fix` to clean up',
  'PEEK-080': 'Use a different branch name or unmount the conflicting branch',
  'PEEK-090': 'Check file permissions on ~/.config/peek'
}

export class PeekError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'PeekError'
  }

  get suggestion(): string {
    return SUGGESTIONS[this.code] ?? 'Run `peek doctor` for diagnosis'
  }

  format(): string {
    return `[${this.code}] ${this.message}\n  → ${this.suggestion}`
  }
}

export function createError(
  code: ErrorCode,
  message: string,
  context?: Record<string, unknown>
): PeekError {
  return new PeekError(message, code, context)
}

export function isRecoverable(code: ErrorCode): boolean {
  const recoverable: ErrorCode[] = [
    'PEEK-003', 'PEEK-004', 'PEEK-011', 'PEEK-020', 'PEEK-030'
  ]
  return recoverable.includes(code)
}

