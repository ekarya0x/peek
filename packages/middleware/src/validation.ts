/**
 * Runtime config validation (Zod-like but zero dependencies)
 * Validates configuration at runtime with clear error messages
 */

export type ValidationError = {
  path: string
  message: string
  expected: string
  received: string
}

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] }

/**
 * Validate a complete PeekConfig object
 */
export function validateConfig(config: unknown): ValidationResult<ValidatedConfig> {
  const errors: ValidationError[] = []

  if (typeof config !== 'object' || config === null) {
    return {
      success: false,
      errors: [{ path: '', message: 'Config must be an object', expected: 'object', received: typeof config }]
    }
  }

  const obj = config as Record<string, unknown>

  // port
  if (obj.port !== undefined) {
    if (typeof obj.port !== 'number') {
      errors.push({ path: 'port', message: 'Must be a number', expected: 'number', received: typeof obj.port })
    } else if (obj.port < 1024 || obj.port > 65535) {
      errors.push({ path: 'port', message: 'Must be between 1024 and 65535', expected: '1024-65535', received: String(obj.port) })
    }
  }

  // wsPort
  if (obj.wsPort !== undefined) {
    if (typeof obj.wsPort !== 'number') {
      errors.push({ path: 'wsPort', message: 'Must be a number', expected: 'number', received: typeof obj.wsPort })
    } else if (obj.wsPort < 1024 || obj.wsPort > 65535) {
      errors.push({ path: 'wsPort', message: 'Must be between 1024 and 65535', expected: '1024-65535', received: String(obj.wsPort) })
    }
  }

  // worktreeDir
  if (obj.worktreeDir !== undefined) {
    if (typeof obj.worktreeDir !== 'string') {
      errors.push({ path: 'worktreeDir', message: 'Must be a string', expected: 'string', received: typeof obj.worktreeDir })
    } else if (obj.worktreeDir.length === 0) {
      errors.push({ path: 'worktreeDir', message: 'Cannot be empty', expected: 'non-empty string', received: '""' })
    }
  }

  // branchPrefix
  if (obj.branchPrefix !== undefined) {
    if (typeof obj.branchPrefix !== 'string') {
      errors.push({ path: 'branchPrefix', message: 'Must be a string', expected: 'string', received: typeof obj.branchPrefix })
    } else if (!/^[a-z0-9-]+$/i.test(obj.branchPrefix)) {
      errors.push({ path: 'branchPrefix', message: 'Must be alphanumeric with dashes', expected: 'alphanumeric', received: obj.branchPrefix })
    }
  }

  // metrics
  if (obj.metrics !== undefined && typeof obj.metrics !== 'boolean') {
    errors.push({ path: 'metrics', message: 'Must be a boolean', expected: 'boolean', received: typeof obj.metrics })
  }

  // federation
  if (obj.federation !== undefined) {
    const fedErrors = validateFederationConfig(obj.federation)
    errors.push(...fedErrors.map(e => ({ ...e, path: `federation.${e.path}` })))
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: obj as ValidatedConfig
  }
}

function validateFederationConfig(config: unknown): ValidationError[] {
  const errors: ValidationError[] = []

  if (typeof config !== 'object' || config === null) {
    return [{ path: '', message: 'Must be an object', expected: 'object', received: typeof config }]
  }

  const obj = config as Record<string, unknown>

  // projects
  if (obj.projects !== undefined) {
    if (typeof obj.projects !== 'object' || obj.projects === null) {
      errors.push({ path: 'projects', message: 'Must be an object', expected: 'object', received: typeof obj.projects })
    } else {
      for (const [name, project] of Object.entries(obj.projects)) {
        const projectErrors = validateFederatedProject(project)
        errors.push(...projectErrors.map(e => ({ ...e, path: `projects.${name}.${e.path}` })))
      }
    }
  }

  // mountDir
  if (obj.mountDir !== undefined) {
    if (typeof obj.mountDir !== 'string') {
      errors.push({ path: 'mountDir', message: 'Must be a string', expected: 'string', received: typeof obj.mountDir })
    }
  }

  return errors
}

function validateFederatedProject(project: unknown): ValidationError[] {
  const errors: ValidationError[] = []

  if (typeof project !== 'object' || project === null) {
    return [{ path: '', message: 'Must be an object', expected: 'object', received: typeof project }]
  }

  const obj = project as Record<string, unknown>

  // path (required)
  if (obj.path === undefined) {
    errors.push({ path: 'path', message: 'Required field', expected: 'string', received: 'undefined' })
  } else if (typeof obj.path !== 'string') {
    errors.push({ path: 'path', message: 'Must be a string', expected: 'string', received: typeof obj.path })
  }

  // alias (optional)
  if (obj.alias !== undefined && typeof obj.alias !== 'string') {
    errors.push({ path: 'alias', message: 'Must be a string', expected: 'string', received: typeof obj.alias })
  }

  // lastAccessed (optional)
  if (obj.lastAccessed !== undefined && typeof obj.lastAccessed !== 'number') {
    errors.push({ path: 'lastAccessed', message: 'Must be a number', expected: 'number', received: typeof obj.lastAccessed })
  }

  return errors
}

export interface ValidatedConfig {
  port?: number
  wsPort?: number
  worktreeDir?: string
  branchPrefix?: string
  metrics?: boolean
  federation?: {
    projects?: Record<string, {
      path: string
      alias?: string
      lastAccessed?: number
    }>
    mountDir?: string
  }
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(e => {
    const path = e.path ? `${e.path}: ` : ''
    return `  ${path}${e.message} (expected ${e.expected}, got ${e.received})`
  }).join('\n')
}

/**
 * Validate and coerce environment variables
 */
export function validateEnvVar(name: string, value: string | undefined, type: 'number' | 'boolean' | 'string'): unknown {
  if (value === undefined) return undefined

  switch (type) {
    case 'number': {
      const num = parseInt(value, 10)
      if (isNaN(num)) {
        throw new Error(`Environment variable ${name} must be a number`)
      }
      return num
    }
    case 'boolean':
      return value === 'true' || value === '1'
    case 'string':
      return value
  }
}

