// TypeScript type definitions for rime resource sync WebUI

export interface RimeApp {
  package: string
  label: string
  rime_path: string
  uid: string
  rime_dir_exists: boolean
}

export type ResourceId = string

export interface ResourceDef {
  id: ResourceId
  name: string
  repo: string
  strategy: string
  order: number
  category?: string
}

export interface Resource extends ResourceDef {
  enabled: boolean
  version: string
}

export interface UpdateCheckResult {
  id: ResourceId
  current: string
  latest: string
  has_update: boolean
  error?: string
}

export interface GitHubRelease {
  tag_name: string
  zipball_url: string
  assets: GitHubAsset[]
}

export interface GitHubAsset {
  name: string
  browser_download_url: string
}

export interface AppConfig {
  target_apps: string
  resources: Resource[]
}

export interface UpdateStatus {
  last_update: string
}

export type ResourceProgressState = 'idle' | 'checking' | 'downloading' | 'extracting' | 'done' | 'error'

export interface ResourceProgress {
  id: ResourceId
  state: ResourceProgressState
  detail: string
}

export type DownloadTaskState = 'idle' | 'running' | 'success' | 'error'
export type DownloadTaskMode = 'single' | 'bulk'

export interface DownloadTaskStatus {
  state: DownloadTaskState
  mode: DownloadTaskMode
  currentId: ResourceId | null
  currentState: ResourceProgressState
  currentDetail: string
  completedIds: ResourceId[]
  failedIds: ResourceId[]
  error: string
  updatedAt: string
}

export type ViewName = 'resources' | 'deploy' | 'settings'

export interface NavItem {
  name: ViewName
  label: string
  icon: string
}
