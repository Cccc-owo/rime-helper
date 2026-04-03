export type RouteName = 'deploy' | 'resources' | 'settings'

export interface RimeApp {
  package: string
  label: string
  rime_path: string
  uid: string
  rime_dir_exists: boolean
}

export type ResourceId = string

export interface Resource {
  id: ResourceId
  name: string
  repo: string
  strategy: string
  order: number
  category?: string
  enabled: boolean
  version: string
  installed: boolean
}

export interface ResourceDef {
  id: ResourceId
  name: string
  repo: string
  strategy: string
  order: number
  category?: string
}

export interface DownloadTaskStatus {
  state: 'idle' | 'running' | 'success' | 'error'
  mode: 'single' | 'bulk'
  currentId: ResourceId | null
  currentState: 'idle' | 'checking' | 'downloading' | 'extracting' | 'done' | 'error'
  currentDetail: string
  completedIds: ResourceId[]
  failedIds: ResourceId[]
  error: string
  updatedAt: string
}

export interface DeployTaskStatus {
  state: 'idle' | 'running' | 'success' | 'error'
  detail: string
  error: string
  updatedAt: string
  lastSuccessAt: string
}

export interface AppSnapshot {
  targetApps: string
  targetCount: number
  resources: Resource[]
  download: DownloadTaskStatus
  deploy: DeployTaskStatus
  summary: {
    enabledResourceCount: number
    installedResourceCount: number
  }
}

export interface UpdateCheckResult {
  id: ResourceId
  current: string
  latest: string
  hasUpdate: boolean
  error?: string
}

export interface AppState {
  route: RouteName
  loading: boolean
  appsLoading: boolean
  snapshot: AppSnapshot | null
  apps: RimeApp[]
  updates: UpdateCheckResult[]
  checkingUpdates: boolean
  updating: boolean
  message: string
  error: string
  logs: string
  logExpanded: boolean
  logLoading: boolean
  lastLogRefreshAt: string
}
