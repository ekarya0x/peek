#!/usr/bin/env node

import { Command } from 'commander'
import { switchCmd } from './commands/switch.js'
import { listCmd } from './commands/list.js'
import { statusCmd } from './commands/status.js'
import { createCmd } from './commands/create.js'
import { removeCmd } from './commands/remove.js'
import { cleanCmd } from './commands/clean.js'
import { scopeCmd } from './commands/scope.js'
import { recoverCmd } from './commands/recover.js'
import { initCmd } from './commands/init.js'
import { startCmd } from './commands/start.js'
import { saveCmd } from './commands/save.js'
import { discardCmd } from './commands/discard.js'
import { 
  federationLinkCmd, 
  federationUnlinkCmd, 
  federationListCmd,
  federationSwitchCmd,
  federationMountCmd,
  federationUnmountCmd,
  federationScopeCmd
} from './commands/federation.js'
import { metricsCmd, metricsClearCmd } from './commands/metrics.js'
import { compareCmd, leaderboardCmd } from './commands/compare.js'
import { doctorCmd } from './commands/doctor.js'
import { completionCmd } from './commands/completion.js'

const program = new Command()

program
  .name('peek')
  .description('The parallel reality engine for your codebase. Any agent, any branch, any project — one command.')
  .version('1.0.0')
  .showHelpAfterError('(see `peek --help` for usage)')
  .showSuggestionAfterError(true)

program.addHelpText('after', `
Examples:
  peek feature/login    # switch dev server to worktree
  peek .                # back to main
  peek -                # previous worktree (toggle)
  peek s ui-review      # start isolated session
  peek save             # merge + cleanup
  peek discard -f       # drop session
  peek diff a1 a2       # compare agents

Federation (Multi-repo):
  peek fed link backend ../backend
  peek fed mount backend feature-x
  peek fed sw backend main

Aliases:
  s=start, sw=switch, ls=list, st=status
  c=create, rm=remove, scope=ctx
  fed=federation, diff=compare, lb=leaderboard
`)

// ============================================
// Default command - switch or show status
// ============================================
program
  .argument('[target]', 'Worktree path, branch name, "." (main), or "-" (previous)')
  .option('-p, --port <port>', 'Dev server port', '3000')
  .action(async (target, opts) => {
    if (!target) {
      await statusCmd()
      return
    }
    await switchCmd(target, opts.port)
  })

// ============================================
// Agent Workflow Commands
// ============================================

program
  .command('start <name>')
  .alias('s')
  .description('Start new isolated agent session')
  .option('--base <ref>', 'Base branch/commit', 'HEAD')
  .option('--at <path>', 'Custom worktree path')
  .option('-p, --port <port>', 'Dev server port', '3000')
  .action(startCmd)

program
  .command('save')
  .description('Save agent work (merge to main + cleanup)')
  .option('-p, --port <port>', 'Dev server port', '3000')
  .option('--keep', 'Keep worktree after merge')
  .option('-m, --message <msg>', 'Commit message for uncommitted changes')
  .option('--push', 'Push after merge')
  .action(saveCmd)

program
  .command('discard')
  .alias('d')
  .description('Discard agent work (remove worktree + branch)')
  .option('-p, --port <port>', 'Dev server port', '3000')
  .option('-f, --force', 'Skip confirmation')
  .action(discardCmd)

// ============================================
// Navigation Commands
// ============================================

program
  .command('switch <target>')
  .alias('sw')
  .description('Switch dev server to worktree')
  .option('-p, --port <port>', 'Dev server port', '3000')
  .action(async (target, opts) => {
    await switchCmd(target, opts.port)
  })

program
  .command('last')
  .alias('-')
  .description('Switch to previous worktree (toggle)')
  .option('-p, --port <port>', 'Dev server port', '3000')
  .action(async (opts) => {
    await switchCmd('-', opts.port)
  })

// ============================================
// Inspection Commands
// ============================================

program
  .command('list')
  .alias('ls')
  .description('List all worktrees')
  .action(listCmd)

program
  .command('status')
  .alias('st')
  .description('Show current peek status')
  .action(statusCmd)

program
  .command('ctx [path]')
  .alias('scope')
  .description('Copy project context to clipboard (for AI)')
  .option('-o, --output', 'Print to stdout instead')
  .option('--depth <n>', 'Max directory depth', '4')
  .action(scopeCmd)

program
  .command('recover')
  .description('Recover stashed changes from discarded sessions')
  .option('--apply <id>', 'Apply stash to current worktree')
  .option('--drop <id>', 'Delete a stash permanently')
  .option('--prune', 'Remove stashes older than 7 days')
  .option('--all', 'Keep stash after applying')
  .action(recoverCmd)

// ============================================
// Agent Deathmatch Commands
// ============================================

program
  .command('compare <worktree1> <worktree2>')
  .alias('diff')
  .description('Compare two worktrees (Agent Deathmatch)')
  .option('-s, --stat', 'Show diff stats')
  .option('-f, --files', 'List changed files')
  .action(compareCmd)

program
  .command('leaderboard')
  .alias('lb')
  .description('Show active agents leaderboard')
  .action(leaderboardCmd)

// ============================================
// Worktree Management
// ============================================

program
  .command('create <branch>')
  .alias('c')
  .description('Create worktree and switch to it')
  .option('--base <ref>', 'Base ref', 'HEAD')
  .option('--at <path>', 'Custom path')
  .option('-p, --port <port>', 'Dev server port', '3000')
  .action(createCmd)

program
  .command('remove <path>')
  .alias('rm')
  .description('Remove worktree and switch to main')
  .option('-f, --force', 'Force remove')
  .option('-p, --port <port>', 'Dev server port', '3000')
  .action(removeCmd)

program
  .command('clean')
  .description('Remove all /tmp/peek/* worktrees')
  .option('-f, --force', 'Force remove')
  .action(cleanCmd)

// ============================================
// Federation (Multi-repo) Commands
// ============================================

const federation = program
  .command('federation')
  .alias('fed')
  .description('Multi-repo federation commands')

federation
  .command('link <name> <path>')
  .description('Link a project to the federation')
  .option('-a, --alias <alias>', 'Alias for the project')
  .action(federationLinkCmd)

federation
  .command('unlink <name>')
  .description('Unlink a project from the federation')
  .action(federationUnlinkCmd)

federation
  .command('list')
  .alias('ls')
  .description('List all federated projects')
  .action(federationListCmd)

federation
  .command('switch <project> <branch>')
  .alias('sw')
  .description('Switch to branch in federated project')
  .action(federationSwitchCmd)

federation
  .command('mount <project> <branch>')
  .description('Mount branch from federated project as worktree')
  .option('--at <path>', 'Custom mount path')
  .action(federationMountCmd)

federation
  .command('unmount <project> <mountPath>')
  .description('Unmount a federated branch')
  .action(federationUnmountCmd)

federation
  .command('scope <project>')
  .description('Get context from federated project')
  .action(federationScopeCmd)

// ============================================
// Metrics Commands
// ============================================

program
  .command('metrics')
  .description('Show performance metrics')
  .option('-j, --json', 'Output as JSON')
  .option('-s, --sessions', 'Show session history')
  .option('-w, --switches', 'Show switch history')
  .option('-l, --limit <n>', 'Limit entries', '10')
  .action(metricsCmd)

program
  .command('metrics-clear')
  .description('Clear metrics history')
  .action(metricsClearCmd)

// ============================================
// Diagnostics
// ============================================

program
  .command('doctor')
  .description('Run diagnostics and fix common issues')
  .option('-f, --fix', 'Auto-fix issues where possible')
  .option('-v, --verbose', 'Show detailed output')
  .action(doctorCmd)

// ============================================
// Setup
// ============================================

program
  .command('init')
  .description('Initialize peek in current project')
  .action(initCmd)

program
  .command('completion <shell>')
  .description('Generate shell completion script (bash, zsh, fish)')
  .action(completionCmd)

program.parse()
