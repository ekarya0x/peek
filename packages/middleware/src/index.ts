export { PeekCore } from './core.js'
export { 
  listWorktrees, 
  createWorktree, 
  removeWorktree, 
  isValidWorktree, 
  getWorktreeInfo,
  isWorktreeLocked,
  pruneWorktrees,
  branchExists,
  getMainRepoPath
} from './worktree.js'
export {
  loadConfig,
  saveConfig,
  generateWorktreeName,
  getWorktreePath,
  type PeekConfig,
  type FederationConfig,
  type FederatedProject
} from './config.js'
export {
  loadMetrics,
  recordSwitch,
  startSession,
  endSession,
  clearMetrics,
  getMetricsSummary,
  startTimer,
  type Timer,
  type SwitchMetric,
  type SessionMetric,
  type MetricsData
} from './metrics.js'
export {
  federationLink,
  federationUnlink,
  federationList,
  federationGetBranches,
  federationMount,
  federationUnmount,
  federationSwitch,
  federationGetScope,
  type FederationState,
  type MountInfo
} from './federation.js'
export {
  TransactionLog,
  StateManager,
  getStateManager,
  resetStateManager,
  type Transaction,
  type TransactionType,
  type TransactionStatus,
  type PeekRuntimeState,
  type RecoveryResult
} from './state.js'
export {
  acquireLock,
  releaseLock,
  forceReleaseLock,
  checkLock,
  withLock,
  PeekLockError,
  type LockInfo,
  type LockResult
} from './lock.js'
export {
  getGitVersion,
  checkGitCompatibility,
  getGitInfo,
  gitExec,
  hasUncommittedChanges,
  getCurrentBranch,
  getMergeBase,
  getDiffStats,
  predictConflictRisk,
  type GitVersion,
  type GitInfo,
  type GitCompatibility,
  type DiffStats,
  type ConflictPrediction
} from './git.js'
export type { PeekState, WorktreeInfo, SwitchEvent, PeekOptions } from './types.js'
export {
  precacheWorktree,
  hardlinkNodeModules,
  estimateWorktreeSize,
  getAvailableDiskSpace,
  hasEnoughDiskSpace,
  optimizedSwitch,
  getPerformanceRecommendations,
  type SwitchPerformance,
  type OptimizationResult
} from './optimizer.js'
export {
  validateConfig,
  formatValidationErrors,
  validateEnvVar,
  type ValidationError,
  type ValidationResult,
  type ValidatedConfig
} from './validation.js'
export {
  detectAuthMethod,
  getRemoteUrl,
  isSSHAgentAvailable,
  gitWithSSH,
  hasLFS,
  fetchLFS,
  hasSubmodules,
  initSubmodules,
  enhancedMount,
  getFederationDiagnostics,
  type SSHAuthConfig,
  type LFSConfig,
  type SubmoduleConfig,
  type EnhancedFederationOptions,
  type FederationDiagnostics
} from './federation-enhanced.js'
export {
  PeekError,
  createError,
  isRecoverable,
  type ErrorCode
} from './errors.js'
export {
  predictNextSwitch,
  getPrefetchCandidates,
  backgroundPrefetch,
  getSwitchVelocity,
  detectTogglePattern,
  type PredictionResult
} from './predictor.js'
export {
  installGuardrail,
  removeGuardrail,
  hasGuardrail,
  isProtectedBranch
} from './guard.js'
export {
  createMetadata,
  getMetadata,
  formatMetadata,
  updateMetadata,
  inferPurpose,
  type WorktreeMetadata
} from './metadata.js'
export {
  stashChanges,
  listStashes,
  getStash,
  applyStash,
  dropStash,
  pruneStashes,
  type StashEntry
} from './stash.js'
export {
  loadShareRules,
  getStrategy,
  applyStrategy,
  applyShareRules,
  type ShareStrategy,
  type ShareRule
} from './sharing.js'
