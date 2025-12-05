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

const program = new Command()

program
  .name('peek')
  .description('Live worktree switcher for the agent era')
  .version('1.0.0')

program
  .argument('[target]', 'Worktree path, branch name, or "." for main')
  .option('-p, --port <port>', 'Dev server port', '3000')
  .action(async (target, opts) => {
    if (!target) {
      await statusCmd()
      return
    }
    await switchCmd(target, opts.port)
  })

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
  .option('-p, --port <port>', 'Dev server port', '3000')
  .action(async (opts) => {
    await switchCmd('-', opts.port)
  })

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

program
  .command('scope [path]')
  .alias('hs')
  .description('Output hierarchical scope for Cursor')
  .option('-o, --output', 'Print to stdout instead of copying')
  .option('--depth <n>', 'Max directory depth', '4')
  .action(scopeCmd)

program
  .command('init')
  .description('Initialize peek in current project')
  .action(initCmd)

program.parse()

