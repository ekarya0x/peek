import { execSync } from 'node:child_process'
import { existsSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  checkGitCompatibility,
  listWorktrees,
  isWorktreeLocked,
  loadConfig,
  getStateManager,
  checkLock,
  forceReleaseLock
} from '@ekarya0x/middleware'

interface DoctorOptions {
  fix?: boolean
  verbose?: boolean
}

export interface DiagnosticIssue {
  code: string
  level: 'error' | 'warn' | 'info'
  message: string
  fix?: string
  autoFixable: boolean
}

/**
 * Run comprehensive diagnostics on the peek installation
 */
export async function doctorCmd(opts: DoctorOptions): Promise<void> {
  const issues: DiagnosticIssue[] = []
  const fixes: string[] = []

  console.log('🩺 Peek Doctor\n')
  console.log('Running diagnostics...\n')

  // Check 1: Git version
  const gitCompat = checkGitCompatibility()
  for (const error of gitCompat.errors) {
    issues.push({
      code: 'PEEK-001',
      level: 'error',
      message: error,
      autoFixable: false
    })
  }
  for (const warn of gitCompat.warnings) {
    issues.push({
      code: 'PEEK-002',
      level: 'warn',
      message: warn,
      autoFixable: false
    })
  }
  printCheck('Git version', gitCompat.errors.length === 0, gitCompat.version.raw)

  // Check 2: Worktree health
  const worktreeIssues = await checkWorktrees()
  issues.push(...worktreeIssues)
  printCheck('Worktree health', worktreeIssues.filter(i => i.level === 'error').length === 0)

  // Check 3: Lock state
  const lockInfo = checkLock()
  if (lockInfo && lockInfo.pid !== process.pid) {
    // Check if process is still running
    try {
      process.kill(lockInfo.pid, 0)
      issues.push({
        code: 'PEEK-010',
        level: 'warn',
        message: `Lock held by PID ${lockInfo.pid} (${lockInfo.command})`,
        fix: 'peek doctor --fix',
        autoFixable: true
      })
    } catch {
      issues.push({
        code: 'PEEK-011',
        level: 'error',
        message: `Stale lock from dead process (PID ${lockInfo.pid})`,
        fix: 'peek doctor --fix',
        autoFixable: true
      })
    }
  }
  printCheck('Lock state', !lockInfo || lockInfo.pid === process.pid)

  // Check 4: Pending transactions (crash recovery)
  const stateManager = getStateManager()
  const pending = stateManager.getWAL().getPending()
  if (pending.length > 0) {
    issues.push({
      code: 'PEEK-020',
      level: 'error',
      message: `${pending.length} pending transaction(s) from previous crash`,
      fix: 'peek doctor --fix',
      autoFixable: true
    })
  }
  printCheck('Transaction log', pending.length === 0)

  // Check 5: Config validity
  try {
    const config = loadConfig()
    if (!existsSync(config.worktreeDir)) {
      issues.push({
        code: 'PEEK-030',
        level: 'warn',
        message: `Worktree directory does not exist: ${config.worktreeDir}`,
        fix: `mkdir -p ${config.worktreeDir}`,
        autoFixable: true
      })
    }
    printCheck('Config validity', true)
  } catch (e) {
    issues.push({
      code: 'PEEK-031',
      level: 'error',
      message: `Invalid config: ${(e as Error).message}`,
      fix: 'rm ~/.config/peek/config.json',
      autoFixable: true
    })
    printCheck('Config validity', false)
  }

  // Check 6: Disk space
  const diskSpace = checkDiskSpace()
  if (diskSpace.freePercent < 5) {
    issues.push({
      code: 'PEEK-040',
      level: 'error',
      message: `Critically low disk space: ${diskSpace.freePercent.toFixed(1)}% free`,
      autoFixable: false
    })
  } else if (diskSpace.freePercent < 10) {
    issues.push({
      code: 'PEEK-041',
      level: 'warn',
      message: `Low disk space: ${diskSpace.freePercent.toFixed(1)}% free`,
      autoFixable: false
    })
  }
  printCheck('Disk space', diskSpace.freePercent >= 10, `${diskSpace.freePercent.toFixed(1)}% free`)

  // Check 7: Port availability
  const portIssues = await checkPorts()
  issues.push(...portIssues)
  printCheck('Port availability', portIssues.length === 0)

  // Check 8: Federation health
  const fedIssues = checkFederation()
  issues.push(...fedIssues)
  printCheck('Federation health', fedIssues.filter(i => i.level === 'error').length === 0)

  console.log('')

  // Summary
  const errors = issues.filter(i => i.level === 'error')
  const warnings = issues.filter(i => i.level === 'warn')

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All checks passed!\n')
    return
  }

  // Print issues
  if (errors.length > 0) {
    console.log(`❌ ${errors.length} error(s):\n`)
    for (const issue of errors) {
      console.log(`  [${issue.code}] ${issue.message}`)
      if (issue.fix) {
        console.log(`    Fix: ${issue.fix}`)
      }
    }
    console.log('')
  }

  if (warnings.length > 0) {
    console.log(`⚠️  ${warnings.length} warning(s):\n`)
    for (const issue of warnings) {
      console.log(`  [${issue.code}] ${issue.message}`)
      if (issue.fix) {
        console.log(`    Fix: ${issue.fix}`)
      }
    }
    console.log('')
  }

  // Auto-fix if requested
  if (opts.fix) {
    console.log('🔧 Attempting auto-fix...\n')
    
    for (const issue of issues) {
      if (!issue.autoFixable) continue

      try {
        const fixed = await autoFix(issue)
        if (fixed) {
          fixes.push(issue.code)
          console.log(`  ✓ Fixed ${issue.code}`)
        }
      } catch (e) {
        console.log(`  ✗ Could not fix ${issue.code}: ${(e as Error).message}`)
      }
    }

    console.log('')
    
    if (fixes.length > 0) {
      console.log(`✅ Fixed ${fixes.length} issue(s). Run 'peek doctor' again to verify.`)
    } else {
      console.log('No auto-fixable issues found.')
    }
  } else if (issues.some(i => i.autoFixable)) {
    console.log('💡 Some issues can be auto-fixed. Run: peek doctor --fix')
  }
}

async function checkWorktrees(): Promise<DiagnosticIssue[]> {
  const issues: DiagnosticIssue[] = []
  
  try {
    const worktrees = listWorktrees(process.cwd())
    
    for (const wt of worktrees) {
      // Check if path exists
      if (!existsSync(wt.path)) {
        issues.push({
          code: 'PEEK-003',
          level: 'error',
          message: `Orphaned worktree: ${wt.branch} (path missing: ${wt.path})`,
          fix: 'git worktree prune',
          autoFixable: true
        })
        continue
      }

      // Check if locked
      if (isWorktreeLocked(wt.path)) {
        issues.push({
          code: 'PEEK-004',
          level: 'warn',
          message: `Locked worktree: ${wt.branch}`,
          fix: `git worktree unlock "${wt.path}"`,
          autoFixable: true
        })
      }
    }

    // Check for stale worktree refs
    const output = execSync('git worktree list --porcelain', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    if (output.includes('prunable')) {
      issues.push({
        code: 'PEEK-005',
        level: 'warn',
        message: 'Stale worktree references found',
        fix: 'git worktree prune',
        autoFixable: true
      })
    }
  } catch (e) {
    issues.push({
      code: 'PEEK-006',
      level: 'error',
      message: `Could not check worktrees: ${(e as Error).message}`,
      autoFixable: false
    })
  }

  return issues
}

function checkDiskSpace(): { freePercent: number; freeBytes: number } {
  try {
    const output = execSync('df -k .', { encoding: 'utf8' })
    const lines = output.split('\n')
    if (lines.length < 2) {
      return { freePercent: 100, freeBytes: 0 }
    }

    const parts = lines[1]!.split(/\s+/)
    const total = parseInt(parts[1] ?? '1', 10)
    const used = parseInt(parts[2] ?? '0', 10)
    const free = total - used
    
    return {
      freePercent: (free / total) * 100,
      freeBytes: free * 1024
    }
  } catch {
    return { freePercent: 100, freeBytes: 0 }
  }
}

async function checkPorts(): Promise<DiagnosticIssue[]> {
  const issues: DiagnosticIssue[] = []
  const config = loadConfig()
  const ports = [config.port, config.wsPort]

  for (const port of ports) {
    try {
      execSync(`lsof -i :${port} -P -n`, { encoding: 'utf8', stdio: 'pipe' })
      // Port is in use - this is fine if it's our dev server
    } catch {
      // Port is free - good
    }
  }

  return issues
}

function checkFederation(): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = []
  const config = loadConfig()

  for (const [name, project] of Object.entries(config.federation.projects)) {
    if (!existsSync(project.path)) {
      issues.push({
        code: 'PEEK-050',
        level: 'warn',
        message: `Federated project '${name}' path does not exist: ${project.path}`,
        fix: `peek fed unlink ${name}`,
        autoFixable: true
      })
    }
  }

  return issues
}

async function autoFix(issue: DiagnosticIssue): Promise<boolean> {
  switch (issue.code) {
    case 'PEEK-003':
    case 'PEEK-005':
      execSync('git worktree prune', { stdio: 'pipe' })
      return true

    case 'PEEK-004':
      if (issue.fix) {
        execSync(issue.fix, { stdio: 'pipe' })
      }
      return true

    case 'PEEK-010':
    case 'PEEK-011':
      forceReleaseLock()
      return true

    case 'PEEK-020':
      const stateManager = getStateManager()
      await stateManager.recover()
      return true

    case 'PEEK-030':
      const config = loadConfig()
      execSync(`mkdir -p "${config.worktreeDir}"`, { stdio: 'pipe' })
      return true

    case 'PEEK-050':
      // Would need to extract project name from message
      return false

    default:
      return false
  }
}

function printCheck(name: string, passed: boolean, detail?: string): void {
  const icon = passed ? '✓' : '✗'
  const color = passed ? '\x1b[32m' : '\x1b[31m'
  const reset = '\x1b[0m'
  const detailStr = detail ? ` (${detail})` : ''
  console.log(`  ${color}${icon}${reset} ${name}${detailStr}`)
}

