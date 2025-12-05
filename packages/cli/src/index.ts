#!/usr/bin/env node

import { Command } from 'commander'
import { switchCmd } from './commands/switch.js'
import { listCmd } from './commands/list.js'
import { statusCmd } from './commands/status.js'
import { createCmd } from './commands/create.js'
import { removeCmd } from './commands/remove.js'
import { cleanCmd } from './commands/clean.js'
import { scopeCmd } from './commands/scope.js'
import { initCmd } from './commands/init.js'
import { startCmd } from './commands/start.js'
import { saveCmd } from './commands/save.js'
import { discardCmd } from './commands/discard.js'

const program = new Command()

program
  .name('peek')
  .description('Any agent, any branch, one command')
  .version('1.0.0')
  .showHelpAfterError('(see `peek --help` for usage)')
  .showSuggestionAfterError(true)

program.addHelpText('after', `
Examples:
  peek switch feature/login    # switch dev server to that worktree
  peek .                       # back to main
  peek -                       # previous worktree
  peek start ui-review         # create isolated worktree
  peek save                    # merge isolated work
  peek discard --force         # drop isolated work
  peek --port 5173 feature/ui  # switch dev server port
`)

// Default command - switch or show status
program
  .argument('[target]', 'Worktree path, branch name, or "." for main')
  .option('-p, --port [port]', 'Dev server port (default: 3000)')
  .action(async (target, opts) => {
    if (!target) {
      await statusCmd()
      return
    }
    await switchCmd(target, opts.port ?? '3000')
  })

// Explicit switch command (same as default)
program
  .command('switch <target>')
  .alias('sw')
  .description('Switch dev server to a worktree')
  .option('-p, --port [port]', 'Dev server port (default: 3000)')
  .action(async (target, opts) => {
    await switchCmd(target, opts.port ?? '3000')
  })

// ============================================
// Agent Workflow Commands
// ============================================

program
  .command('start <name>')
  .alias('s')
  .description('Start new isolated work session (creates worktree)')
  .option('--base <ref>', 'Base branch/commit', 'HEAD')
  .option('--at <path>', 'Custom worktree path')
  .option('-p, --port [port]', 'Dev server port (default: 3000)')
  .action(startCmd)

program
  .command('save')
  .description('Save agent work (merge and optionally cleanup)')
  .option('-p, --port [port]', 'Dev server port (default: 3000)')
  .option('--keep', 'Keep worktree after merge')
  .option('-m, --message <msg>', 'Commit message for uncommitted changes')
  .option('--push', 'Push after merge')
  .action(saveCmd)

program
  .command('discard')
  .description('Discard agent work (remove worktree and branch)')
  .option('-p, --port [port]', 'Dev server port (default: 3000)')
  .option('-f, --force', 'Skip confirmation')
  .action(discardCmd)

// ============================================
// Core Commands
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
  .command('last')
  .alias('-')
  .description('Switch to previous worktree')
  .option('-p, --port [port]', 'Dev server port (default: 3000)')
  .action(async (opts) => {
    await switchCmd('-', opts.port ?? '3000')
  })

// ============================================
// Worktree Management
// ============================================

program
  .command('create <branch>')
  .alias('c')
  .description('Create worktree and switch to it')
  .option('--base <ref>', 'Base ref', 'HEAD')
  .option('--at <path>', 'Custom path')
  .option('-p, --port [port]', 'Dev server port (default: 3000)')
  .action(createCmd)

program
  .command('remove <path>')
  .alias('rm')
  .description('Remove worktree and switch to main')
  .option('-f, --force', 'Force remove')
  .option('-p, --port [port]', 'Dev server port (default: 3000)')
  .action(removeCmd)

program
  .command('clean')
  .description('Remove all /tmp/peek/* worktrees')
  .option('-f, --force', 'Force remove')
  .action(cleanCmd)

// ============================================
// Utilities
// ============================================

program
  .command('scope [path]')
  .alias('ctx')
  .description('Copy project context to clipboard (for AI agents)')
  .option('-o, --output', 'Print to stdout instead of copying')
  .option('--depth <n>', 'Max directory depth', '4')
  .action(scopeCmd)

program
  .command('init')
  .description('Initialize peek in current project')
  .action(initCmd)

program.parse()
