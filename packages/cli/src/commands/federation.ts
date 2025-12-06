import {
  federationLink,
  federationUnlink,
  federationList,
  federationMount,
  federationUnmount,
  federationSwitch,
  federationGetScope
} from '@ekarya0x/middleware'

interface LinkOptions {
  alias?: string
}

interface MountOptions {
  at?: string
}

/**
 * Link a project to the federation
 */
export async function federationLinkCmd(
  name: string,
  path: string,
  opts: LinkOptions
): Promise<void> {
  console.log(`\n🔗 Linking project: ${name}`)
  console.log(`   Path: ${path}`)
  if (opts.alias) {
    console.log(`   Alias: ${opts.alias}`)
  }

  const result = federationLink(name, path, opts.alias)

  if (!result.success) {
    console.error(`\n❌ ${result.error}`)
    process.exit(1)
  }

  console.log(`\n✅ Project linked!`)
  console.log(`\n   peek fed mount ${name} <branch>  # mount a branch`)
  console.log(`   peek fed sw ${name} <branch>     # switch project branch`)
  console.log(`   peek fed scope ${name}           # get context`)
}

/**
 * Unlink a project from the federation
 */
export async function federationUnlinkCmd(name: string): Promise<void> {
  const result = federationUnlink(name)

  if (!result.success) {
    console.error(`❌ ${result.error}`)
    process.exit(1)
  }

  console.log(`✅ Project ${name} unlinked from federation.`)
}

/**
 * List all federated projects
 */
export async function federationListCmd(): Promise<void> {
  const state = federationList()
  const projects = Object.entries(state.projects)

  if (projects.length === 0) {
    console.log('No federated projects.')
    console.log('\nLink a project:')
    console.log('  peek fed link <name> <path>')
    return
  }

  console.log('🌐 Federated Projects\n')

  for (const [name, project] of projects) {
    console.log(`  ${name}`)
    console.log(`    Path: ${project.path}`)
    if (project.alias && project.alias !== name) {
      console.log(`    Alias: ${project.alias}`)
    }
    if (project.worktrees.length > 0) {
      console.log(`    Branches: ${project.worktrees.slice(0, 5).join(', ')}${project.worktrees.length > 5 ? '...' : ''}`)
    }
    console.log('')
  }

  if (state.mounts.length > 0) {
    console.log('📁 Active Mounts\n')
    for (const mount of state.mounts) {
      console.log(`  ${mount.project}/${mount.branch}`)
      console.log(`    → ${mount.mountPath}`)
      console.log('')
    }
  }
}

/**
 * Switch to a branch in a federated project
 */
export async function federationSwitchCmd(
  project: string,
  branch: string
): Promise<void> {
  console.log(`Switching ${project} to ${branch}...`)

  const result = federationSwitch(project, branch)

  if (!result.success) {
    console.error(`❌ ${result.error}`)
    process.exit(1)
  }

  console.log(`✅ ${project} now on branch: ${branch}`)
  console.log(`   Path: ${result.path}`)
}

/**
 * Mount a branch from a federated project
 */
export async function federationMountCmd(
  project: string,
  branch: string,
  opts: MountOptions
): Promise<void> {
  console.log(`\n🔌 Mounting ${project}/${branch}...`)

  const result = federationMount(project, branch, opts.at)

  if (!result.success) {
    console.error(`\n❌ ${result.error}`)
    process.exit(1)
  }

  console.log(`\n✅ Mounted!`)
  console.log(`   Path: ${result.path}`)
  console.log(`\n   peek switch ${result.path}  # switch to it`)
  console.log(`   peek fed unmount ${project} ${result.path}  # unmount`)
}

/**
 * Unmount a federated branch
 */
export async function federationUnmountCmd(
  project: string,
  mountPath: string
): Promise<void> {
  const result = federationUnmount(project, mountPath)

  if (!result.success) {
    console.error(`❌ ${result.error}`)
    process.exit(1)
  }

  console.log(`✅ Unmounted ${mountPath}`)
}

/**
 * Get scope/context from a federated project
 */
export async function federationScopeCmd(project: string): Promise<void> {
  const scope = federationGetScope(project)

  if (!scope) {
    console.error(`❌ Could not get scope for project: ${project}`)
    process.exit(1)
  }

  try {
    const proc = await import('node:child_process')
    if (process.platform === 'darwin') {
      proc.execSync('pbcopy', { input: scope })
    } else {
      proc.execSync('xclip -selection clipboard', { input: scope })
    }
    console.log('✅ Federated project scope copied to clipboard.')
  } catch {
    console.log(scope)
  }
}

