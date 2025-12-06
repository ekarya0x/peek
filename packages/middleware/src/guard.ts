/**
 * Guardrails to prevent accidental commits to wrong branch
 */

import { existsSync, writeFileSync, chmodSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { getCurrentBranch } from './git.js'

const GUARD_MARKER = '# PEEK-GUARDRAIL'

const PRE_COMMIT_HOOK = `#!/bin/sh
${GUARD_MARKER}
# Prevent commits to main from worktrees

PEEK_MAIN="\${PEEK_MAIN_WORKTREE:-}"
if [ -z "$PEEK_MAIN" ]; then
  exit 0
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
  CURRENT_DIR=$(pwd)
  if [ "$CURRENT_DIR" != "$PEEK_MAIN" ]; then
    echo ""
    echo "⚠️  You're in a worktree but trying to commit to $CURRENT_BRANCH"
    echo "   Current: $CURRENT_DIR"
    echo "   Main:    $PEEK_MAIN"
    echo ""
    echo "   To commit anyway: PEEK_ALLOW_MAIN=1 git commit ..."
    echo "   To switch:        peek sw ."
    echo ""
    if [ -z "$PEEK_ALLOW_MAIN" ]; then
      exit 1
    fi
  fi
fi
exit 0
`

/**
 * Install guardrail hook in a worktree
 */
export function installGuardrail(worktreePath: string, mainPath: string): boolean {
  const hookPath = join(worktreePath, '.git', 'hooks', 'pre-commit')
  const hooksDir = join(worktreePath, '.git', 'hooks')

  // If .git is a file (gitdir: reference), resolve it
  const gitPath = join(worktreePath, '.git')
  if (existsSync(gitPath)) {
    try {
      // Check if existing hook exists and has our marker
      if (existsSync(hookPath)) {
        const content = readFileSync(hookPath, 'utf8')
        if (content.includes(GUARD_MARKER)) {
          return true // Already installed
        }
        if (content.trim().length > 0) {
          return false // Don't overwrite user's hook
        }
      }

      writeFileSync(hookPath, PRE_COMMIT_HOOK)
      chmodSync(hookPath, 0o755)
      return true
    } catch {
      return false
    }
  }

  return false
}

/**
 * Remove guardrail from a worktree
 */
export function removeGuardrail(worktreePath: string): boolean {
  const hookPath = join(worktreePath, '.git', 'hooks', 'pre-commit')

  if (!existsSync(hookPath)) return true

  try {
    const content = readFileSync(hookPath, 'utf8')
    if (content.includes(GUARD_MARKER)) {
      const { unlinkSync } = require('node:fs')
      unlinkSync(hookPath)
      return true
    }
  } catch {
    // Ignore errors
  }

  return false
}

/**
 * Check if guardrail is installed
 */
export function hasGuardrail(worktreePath: string): boolean {
  const hookPath = join(worktreePath, '.git', 'hooks', 'pre-commit')

  if (!existsSync(hookPath)) return false

  try {
    const content = readFileSync(hookPath, 'utf8')
    return content.includes(GUARD_MARKER)
  } catch {
    return false
  }
}

/**
 * Check if current branch is protected
 */
export function isProtectedBranch(cwd: string): boolean {
  const branch = getCurrentBranch(cwd)
  return branch === 'main' || branch === 'master'
}

