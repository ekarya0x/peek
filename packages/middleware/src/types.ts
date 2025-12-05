export interface WorktreeInfo {
  path: string
  branch: string
  commit: string
  isMain: boolean
  isBare: boolean
}

export interface PeekState {
  current: string
  previous: string | null
  main: string
  history: string[]
}

export interface SwitchEvent {
  from: string
  to: string
  info: WorktreeInfo
}

export interface PeekOptions {
  mainPath?: string
  historyLimit?: number
}

