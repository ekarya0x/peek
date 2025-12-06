import { listWorktrees, federationList, loadConfig } from '@ekarya0x/middleware'

/**
 * Generate shell completion script
 */
export async function completionCmd(shell: string): Promise<void> {
  switch (shell) {
    case 'bash':
      console.log(generateBashCompletion())
      break
    case 'zsh':
      console.log(generateZshCompletion())
      break
    case 'fish':
      console.log(generateFishCompletion())
      break
    default:
      console.log(`Unsupported shell: ${shell}`)
      console.log('Supported shells: bash, zsh, fish')
      console.log('')
      console.log('Usage:')
      console.log('  peek completion bash >> ~/.bashrc')
      console.log('  peek completion zsh >> ~/.zshrc')
      console.log('  peek completion fish >> ~/.config/fish/completions/peek.fish')
      process.exit(1)
  }
}

function generateBashCompletion(): string {
  return `# Peek bash completion
# Add to ~/.bashrc: eval "$(peek completion bash)"

_peek_completions() {
    local cur prev opts
    COMPREPLY=()
    cur="\${COMP_WORDS[COMP_CWORD]}"
    prev="\${COMP_WORDS[COMP_CWORD-1]}"
    
    # Main commands
    local commands="start save discard switch list status scope compare leaderboard create remove clean federation metrics doctor init completion"
    local aliases="s sw ls st ctx diff lb c rm fed"
    
    # Options
    local global_opts="-p --port -h --help -v --version"
    
    case "\${prev}" in
        peek)
            COMPREPLY=( $(compgen -W "\${commands} \${aliases} . -" -- "\${cur}") )
            return 0
            ;;
        start|s)
            COMPREPLY=( $(compgen -W "--base --at -p --port" -- "\${cur}") )
            return 0
            ;;
        save)
            COMPREPLY=( $(compgen -W "--keep -m --message --push -p --port" -- "\${cur}") )
            return 0
            ;;
        discard|d)
            COMPREPLY=( $(compgen -W "-f --force -p --port" -- "\${cur}") )
            return 0
            ;;
        switch|sw)
            # Complete with worktree names
            local worktrees=$(peek list 2>/dev/null | grep -v "^Worktrees:" | awk '{print $2}' | tr '\\n' ' ')
            COMPREPLY=( $(compgen -W "\${worktrees} . -" -- "\${cur}") )
            return 0
            ;;
        remove|rm)
            COMPREPLY=( $(compgen -W "-f --force -p --port" -- "\${cur}") )
            return 0
            ;;
        scope|ctx)
            COMPREPLY=( $(compgen -W "-o --output --depth" -- "\${cur}") )
            return 0
            ;;
        compare|diff)
            local worktrees=$(peek list 2>/dev/null | grep -v "^Worktrees:" | awk '{print $2}' | tr '\\n' ' ')
            COMPREPLY=( $(compgen -W "\${worktrees} -s --stat -f --files" -- "\${cur}") )
            return 0
            ;;
        federation|fed)
            COMPREPLY=( $(compgen -W "link unlink list switch mount unmount scope ls sw" -- "\${cur}") )
            return 0
            ;;
        metrics)
            COMPREPLY=( $(compgen -W "-j --json -s --sessions -w --switches -l --limit" -- "\${cur}") )
            return 0
            ;;
        doctor)
            COMPREPLY=( $(compgen -W "-f --fix -v --verbose" -- "\${cur}") )
            return 0
            ;;
        completion)
            COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
            return 0
            ;;
        *)
            COMPREPLY=( $(compgen -W "\${global_opts}" -- "\${cur}") )
            return 0
            ;;
    esac
}

complete -F _peek_completions peek
`
}

function generateZshCompletion(): string {
  return `#compdef peek
# Peek zsh completion
# Add to ~/.zshrc: eval "$(peek completion zsh)"

_peek() {
    local -a commands
    commands=(
        'start:Start new isolated agent session'
        's:Start new isolated agent session (alias)'
        'save:Save agent work (merge to main + cleanup)'
        'discard:Discard agent work'
        'd:Discard agent work (alias)'
        'switch:Switch dev server to worktree'
        'sw:Switch dev server to worktree (alias)'
        'list:List all worktrees'
        'ls:List all worktrees (alias)'
        'status:Show current peek status'
        'st:Show current peek status (alias)'
        'scope:Copy project context to clipboard'
        'ctx:Copy project context to clipboard (alias)'
        'compare:Compare two worktrees'
        'diff:Compare two worktrees (alias)'
        'leaderboard:Show active agents leaderboard'
        'lb:Show active agents leaderboard (alias)'
        'create:Create worktree and switch to it'
        'c:Create worktree and switch to it (alias)'
        'remove:Remove worktree'
        'rm:Remove worktree (alias)'
        'clean:Remove all temp worktrees'
        'federation:Multi-repo federation commands'
        'fed:Multi-repo federation commands (alias)'
        'metrics:Show performance metrics'
        'doctor:Run diagnostics and fix issues'
        'init:Initialize peek in current project'
        'completion:Generate shell completion'
    )

    _arguments -C \\
        '1: :->command' \\
        '*: :->args'

    case "\$state" in
        command)
            _describe 'command' commands
            _alternative 'special:special targets:(. -)'
            ;;
        args)
            case "\$words[2]" in
                start|s)
                    _arguments \\
                        '--base[Base branch/commit]:ref:' \\
                        '--at[Custom worktree path]:path:_files -/' \\
                        '-p[Dev server port]:port:' \\
                        '--port[Dev server port]:port:'
                    ;;
                switch|sw)
                    local worktrees
                    worktrees=(\${(f)"\$(peek list 2>/dev/null | grep -v '^Worktrees:' | awk '{print \$2}')"})
                    _alternative \\
                        'worktrees:worktree:(\$worktrees)' \\
                        'special:special:(. -)'
                    ;;
                federation|fed)
                    local -a fed_commands
                    fed_commands=(
                        'link:Link a project to the federation'
                        'unlink:Unlink a project'
                        'list:List federated projects'
                        'ls:List federated projects (alias)'
                        'switch:Switch to branch in federated project'
                        'sw:Switch to branch (alias)'
                        'mount:Mount branch as worktree'
                        'unmount:Unmount a federated branch'
                        'scope:Get context from federated project'
                    )
                    _describe 'federation command' fed_commands
                    ;;
                completion)
                    _values 'shell' bash zsh fish
                    ;;
            esac
            ;;
    esac
}

_peek
`
}

function generateFishCompletion(): string {
  return `# Peek fish completion
# Save to: ~/.config/fish/completions/peek.fish

# Disable file completion by default
complete -c peek -f

# Main commands
complete -c peek -n "__fish_use_subcommand" -a "start" -d "Start new isolated agent session"
complete -c peek -n "__fish_use_subcommand" -a "s" -d "Start (alias)"
complete -c peek -n "__fish_use_subcommand" -a "save" -d "Save agent work"
complete -c peek -n "__fish_use_subcommand" -a "discard" -d "Discard agent work"
complete -c peek -n "__fish_use_subcommand" -a "d" -d "Discard (alias)"
complete -c peek -n "__fish_use_subcommand" -a "switch" -d "Switch to worktree"
complete -c peek -n "__fish_use_subcommand" -a "sw" -d "Switch (alias)"
complete -c peek -n "__fish_use_subcommand" -a "list" -d "List worktrees"
complete -c peek -n "__fish_use_subcommand" -a "ls" -d "List (alias)"
complete -c peek -n "__fish_use_subcommand" -a "status" -d "Show status"
complete -c peek -n "__fish_use_subcommand" -a "st" -d "Status (alias)"
complete -c peek -n "__fish_use_subcommand" -a "scope" -d "Copy context to clipboard"
complete -c peek -n "__fish_use_subcommand" -a "ctx" -d "Scope (alias)"
complete -c peek -n "__fish_use_subcommand" -a "compare" -d "Compare worktrees"
complete -c peek -n "__fish_use_subcommand" -a "diff" -d "Compare (alias)"
complete -c peek -n "__fish_use_subcommand" -a "leaderboard" -d "Show agent leaderboard"
complete -c peek -n "__fish_use_subcommand" -a "lb" -d "Leaderboard (alias)"
complete -c peek -n "__fish_use_subcommand" -a "create" -d "Create worktree"
complete -c peek -n "__fish_use_subcommand" -a "c" -d "Create (alias)"
complete -c peek -n "__fish_use_subcommand" -a "remove" -d "Remove worktree"
complete -c peek -n "__fish_use_subcommand" -a "rm" -d "Remove (alias)"
complete -c peek -n "__fish_use_subcommand" -a "clean" -d "Remove all temp worktrees"
complete -c peek -n "__fish_use_subcommand" -a "federation" -d "Federation commands"
complete -c peek -n "__fish_use_subcommand" -a "fed" -d "Federation (alias)"
complete -c peek -n "__fish_use_subcommand" -a "metrics" -d "Show metrics"
complete -c peek -n "__fish_use_subcommand" -a "doctor" -d "Run diagnostics"
complete -c peek -n "__fish_use_subcommand" -a "init" -d "Initialize peek"
complete -c peek -n "__fish_use_subcommand" -a "completion" -d "Generate completion"
complete -c peek -n "__fish_use_subcommand" -a "." -d "Back to main"
complete -c peek -n "__fish_use_subcommand" -a "-" -d "Previous worktree"

# start options
complete -c peek -n "__fish_seen_subcommand_from start s" -l base -d "Base branch/commit"
complete -c peek -n "__fish_seen_subcommand_from start s" -l at -d "Custom worktree path"
complete -c peek -n "__fish_seen_subcommand_from start s" -s p -l port -d "Dev server port"

# save options
complete -c peek -n "__fish_seen_subcommand_from save" -l keep -d "Keep worktree after merge"
complete -c peek -n "__fish_seen_subcommand_from save" -s m -l message -d "Commit message"
complete -c peek -n "__fish_seen_subcommand_from save" -l push -d "Push after merge"

# discard options
complete -c peek -n "__fish_seen_subcommand_from discard d" -s f -l force -d "Skip confirmation"

# scope options
complete -c peek -n "__fish_seen_subcommand_from scope ctx" -s o -l output -d "Print to stdout"
complete -c peek -n "__fish_seen_subcommand_from scope ctx" -l depth -d "Max directory depth"

# compare options
complete -c peek -n "__fish_seen_subcommand_from compare diff" -s s -l stat -d "Show diff stats"
complete -c peek -n "__fish_seen_subcommand_from compare diff" -s f -l files -d "List changed files"

# metrics options
complete -c peek -n "__fish_seen_subcommand_from metrics" -s j -l json -d "Output as JSON"
complete -c peek -n "__fish_seen_subcommand_from metrics" -s s -l sessions -d "Show sessions"
complete -c peek -n "__fish_seen_subcommand_from metrics" -s w -l switches -d "Show switches"
complete -c peek -n "__fish_seen_subcommand_from metrics" -s l -l limit -d "Limit entries"

# doctor options
complete -c peek -n "__fish_seen_subcommand_from doctor" -s f -l fix -d "Auto-fix issues"
complete -c peek -n "__fish_seen_subcommand_from doctor" -s v -l verbose -d "Verbose output"

# federation subcommands
complete -c peek -n "__fish_seen_subcommand_from federation fed" -a "link" -d "Link project"
complete -c peek -n "__fish_seen_subcommand_from federation fed" -a "unlink" -d "Unlink project"
complete -c peek -n "__fish_seen_subcommand_from federation fed" -a "list ls" -d "List projects"
complete -c peek -n "__fish_seen_subcommand_from federation fed" -a "switch sw" -d "Switch branch"
complete -c peek -n "__fish_seen_subcommand_from federation fed" -a "mount" -d "Mount branch"
complete -c peek -n "__fish_seen_subcommand_from federation fed" -a "unmount" -d "Unmount branch"
complete -c peek -n "__fish_seen_subcommand_from federation fed" -a "scope" -d "Get context"

# completion shells
complete -c peek -n "__fish_seen_subcommand_from completion" -a "bash zsh fish"
`
}

/**
 * Get dynamic completions for worktrees
 */
export function getWorktreeCompletions(): string[] {
  try {
    const worktrees = listWorktrees(process.cwd())
    return worktrees.map(w => w.branch)
  } catch {
    return []
  }
}

/**
 * Get dynamic completions for federated projects
 */
export function getFederationCompletions(): string[] {
  try {
    const state = federationList()
    return Object.keys(state.projects)
  } catch {
    return []
  }
}

