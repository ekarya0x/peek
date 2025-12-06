import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { homedir } from 'node:os'

export interface PeekConfig {
  /** Default dev server port */
  port: number
  /** WebSocket port for real-time updates */
  wsPort: number
  /** Base directory for temporary worktrees */
  worktreeDir: string
  /** Branch naming pattern: 'agent' | 'peek' | 'custom' */
  branchPrefix: string
  /** Enable metrics collection */
  metrics: boolean
  /** Federation settings */
  federation: FederationConfig
}

export interface FederationConfig {
  /** Linked projects */
  projects: Record<string, FederatedProject>
  /** Default mount location */
  mountDir: string
}

export interface FederatedProject {
  path: string
  alias?: string
  lastAccessed?: number
}

const DEFAULT_CONFIG: PeekConfig = {
  port: 3000,
  wsPort: 24789,
  worktreeDir: '/tmp/peek',
  branchPrefix: 'agent',
  metrics: true,
  federation: {
    projects: {},
    mountDir: '/tmp/peek/mounts'
  }
}

const CONFIG_DIR = join(homedir(), '.config', 'peek')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')
const LOCAL_CONFIG_FILE = '.peekrc.json'

/**
 * Load peek configuration from disk
 * Merges: defaults < global config < local config < env vars
 */
export function loadConfig(cwd: string = process.cwd()): PeekConfig {
  let config = { ...DEFAULT_CONFIG }

  // Load global config
  if (existsSync(CONFIG_FILE)) {
    try {
      const global = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
      config = mergeConfig(config, global)
    } catch {
      // Invalid config, use defaults
    }
  }

  // Load local config
  const localPath = join(cwd, LOCAL_CONFIG_FILE)
  if (existsSync(localPath)) {
    try {
      const local = JSON.parse(readFileSync(localPath, 'utf8'))
      config = mergeConfig(config, local)
    } catch {
      // Invalid local config
    }
  }

  // Environment variable overrides
  if (process.env.PEEK_PORT) {
    config.port = parseInt(process.env.PEEK_PORT, 10)
  }
  if (process.env.PEEK_WS_PORT) {
    config.wsPort = parseInt(process.env.PEEK_WS_PORT, 10)
  }
  if (process.env.PEEK_WORKTREE_DIR) {
    config.worktreeDir = process.env.PEEK_WORKTREE_DIR
  }
  if (process.env.PEEK_BRANCH_PREFIX) {
    config.branchPrefix = process.env.PEEK_BRANCH_PREFIX
  }

  return config
}

/**
 * Save configuration to disk
 */
export function saveConfig(config: Partial<PeekConfig>, global: boolean = false): void {
  const targetPath = global ? CONFIG_FILE : LOCAL_CONFIG_FILE
  const targetDir = global ? CONFIG_DIR : process.cwd()

  if (global && !existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }

  const existing = existsSync(targetPath)
    ? JSON.parse(readFileSync(targetPath, 'utf8'))
    : {}

  const merged = mergeConfig(existing, config)
  writeFileSync(targetPath, JSON.stringify(merged, null, 2))
}

/**
 * Generate a worktree name based on config
 */
export function generateWorktreeName(name: string, config: PeekConfig): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)

  return `${config.branchPrefix}/${slug}`
}

/**
 * Get the default worktree path for a session
 */
export function getWorktreePath(name: string, config: PeekConfig): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)

  return join(config.worktreeDir, `peek-${slug}`)
}

function mergeConfig(base: PeekConfig, override: Partial<PeekConfig>): PeekConfig {
  return {
    ...base,
    ...override,
    federation: {
      ...base.federation,
      ...(override.federation ?? {}),
      projects: {
        ...base.federation.projects,
        ...(override.federation?.projects ?? {})
      }
    }
  }
}

