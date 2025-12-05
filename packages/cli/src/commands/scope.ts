import { execSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

interface ScopeOptions {
  output?: boolean
  depth?: string
}

const EXCLUDE = ['node_modules', '.git', 'dist', 'build', '.next', '.cache', '.turbo', 'coverage']

const KEY_FILES = [
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'vite.config.js',
  'next.config.js',
  'next.config.ts',
  'README.md'
]

export async function scopeCmd(path: string | undefined, opts: ScopeOptions): Promise<void> {
  const targetPath = path ?? process.cwd()
  const maxDepth = parseInt(opts.depth ?? '4', 10)

  const scope = generateScope(targetPath, maxDepth)

  if (opts.output) {
    console.log(scope)
    return
  }

  try {
    const proc = await import('node:child_process')
    if (process.platform === 'darwin') {
      proc.execSync('pbcopy', { input: scope })
    } else {
      proc.execSync('xclip -selection clipboard', { input: scope })
    }
    console.log('Scope copied to clipboard.')
  } catch {
    console.log(scope)
  }
}

function generateScope(path: string, maxDepth: number): string {
  const lines: string[] = []

  lines.push('# Worktree Context')
  lines.push('')

  lines.push('## Git State')
  lines.push('```')
  lines.push(`Path: ${path}`)

  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: path, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
    const commit = execSync('git rev-parse --short HEAD', { cwd: path, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
    const status = execSync('git status --short', { cwd: path, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()

    lines.push(`Branch: ${branch}`)
    lines.push(`Commit: ${commit}`)
    lines.push('')
    lines.push('Changes:')
    lines.push(status || '(none)')
  } catch {
    lines.push('(Unable to read git state)')
  }

  lines.push('```')
  lines.push('')

  lines.push('## Structure')
  lines.push('```')
  lines.push(generateTree(path, '', 0, maxDepth))
  lines.push('```')
  lines.push('')

  lines.push('## Key Files')
  lines.push('')

  const keyFiles = findKeyFiles(path)
  for (const file of keyFiles.slice(0, 10)) {
    const fullPath = join(path, file)
    const stat = statSync(fullPath)

    if (stat.size > 30000) {
      lines.push(`### ${file}`)
      lines.push(`(${Math.round(stat.size / 1024)}KB - truncated)`)
      lines.push('')
      continue
    }

    const content = readFileSync(fullPath, 'utf8')
    const ext = file.split('.').pop() ?? ''

    lines.push(`### ${file}`)
    lines.push('```' + ext)
    lines.push(content.trim())
    lines.push('```')
    lines.push('')
  }

  lines.push('## Instructions')
  lines.push('')
  lines.push(`Working in: \`${path}\``)
  lines.push('')
  lines.push('- Paths are relative to this worktree')
  lines.push('- Changes are isolated from main')
  lines.push('- Safe to experiment')

  return lines.join('\n')
}

function generateTree(dir: string, prefix: string, depth: number, maxDepth: number): string {
  if (depth >= maxDepth) return prefix + '...\n'

  let entries: string[]
  try {
    entries = readdirSync(dir)
      .filter(e => !EXCLUDE.includes(e) && !e.startsWith('.'))
      .sort((a, b) => {
        const aIsDir = statSync(join(dir, a)).isDirectory()
        const bIsDir = statSync(join(dir, b)).isDirectory()
        if (aIsDir && !bIsDir) return -1
        if (!aIsDir && bIsDir) return 1
        return a.localeCompare(b)
      })
  } catch {
    return ''
  }

  let result = ''

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!
    const fullPath = join(dir, entry)
    const isLast = i === entries.length - 1
    const connector = isLast ? '└── ' : '├── '
    const childPrefix = isLast ? '    ' : '│   '

    try {
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        result += prefix + connector + entry + '/\n'
        result += generateTree(fullPath, prefix + childPrefix, depth + 1, maxDepth)
      } else {
        result += prefix + connector + entry + '\n'
      }
    } catch {
      continue
    }
  }

  return result
}

function findKeyFiles(dir: string): string[] {
  const found: string[] = []

  for (const file of KEY_FILES) {
    if (existsSync(join(dir, file))) {
      found.push(file)
    }
  }

  const srcDir = join(dir, 'src')
  if (existsSync(srcDir)) {
    const srcFiles = ['index.ts', 'index.tsx', 'main.ts', 'main.tsx', 'App.tsx', 'App.ts']
    for (const file of srcFiles) {
      if (existsSync(join(srcDir, file))) {
        found.push(`src/${file}`)
      }
    }
  }

  return found
}

