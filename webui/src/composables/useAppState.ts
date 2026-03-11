import { computed, readonly, ref } from 'vue'
import { getAppStateSnapshot, startDownloadEnabledTask, startDownloadTask } from '@/api/commands'
import type { AppConfig, AppStateSnapshot, DownloadTaskStatus, Resource, ResourceId, UpdateStatus } from '@/types'

const snapshot = ref<AppStateSnapshot | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const polling = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null
let lastFingerprint = ''

function applySnapshot(next: AppStateSnapshot) {
  snapshot.value = next
  lastFingerprint = JSON.stringify(next)
}

async function refresh(force = false): Promise<AppStateSnapshot> {
  loading.value = true
  try {
    const next = await getAppStateSnapshot()
    const fingerprint = JSON.stringify(next)
    if (force || fingerprint !== lastFingerprint) {
      applySnapshot(next)
    }
    error.value = null
    return next
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    throw e
  } finally {
    loading.value = false
  }
}

function hasActiveTask(status: AppStateSnapshot | null): boolean {
  if (!status) return false
  return status.download.state === 'running' || status.deploy.state === 'running'
}

async function syncAndMaybeStop(force = false) {
  const next = await refresh(force)
  if (!hasActiveTask(next)) {
    stopPolling()
  }
}

function startPolling() {
  if (pollTimer) return
  polling.value = true
  pollTimer = setInterval(() => {
    syncAndMaybeStop().catch(e => {
      error.value = e instanceof Error ? e.message : String(e)
      stopPolling()
    })
  }, 1000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  polling.value = false
}

async function yieldToUiPaint() {
  await new Promise<void>(resolve => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
      return
    }
    setTimeout(resolve, 0)
  })
}

export function useAppState() {
  const resources = computed<Resource[]>(() => snapshot.value?.resources ?? [])
  const resourceMap = computed<Record<string, Resource>>(() => Object.fromEntries(resources.value.map(resource => [resource.id, resource])))
  const download = computed<DownloadTaskStatus>(() => snapshot.value?.download ?? {
    state: 'idle',
    mode: 'single',
    currentId: null,
    currentState: 'idle',
    currentDetail: '',
    completedIds: [],
    failedIds: [],
    error: '',
    updatedAt: '',
  })
  const deploy = computed(() => snapshot.value?.deploy ?? {
    state: 'idle',
    detail: '',
    error: '',
    updatedAt: '',
    lastSuccessAt: '0',
  })
  const targetApps = computed(() => snapshot.value?.targetApps ?? '')
  const targetCount = computed(() => snapshot.value?.targetCount ?? 0)
  const enabledResourceCount = computed(() => snapshot.value?.summary.enabledResourceCount ?? 0)
  const installedResourceCount = computed(() => snapshot.value?.summary.installedResourceCount ?? 0)
  const config = computed<AppConfig | null>(() => {
    if (!snapshot.value) return null
    return {
      target_apps: snapshot.value.targetApps,
      resources: [...snapshot.value.resources],
    }
  })
  const isDownloadingAny = computed(() => download.value.state === 'running')
  const downloadError = computed(() => download.value.state === 'error'
    ? (download.value.error || download.value.currentDetail || '下载失败')
    : null)
  const isDeploying = computed(() => deploy.value.state === 'running')
  const updateStatus = computed<UpdateStatus>(() => ({
    last_download_completed_at: download.value.updatedAt || '0',
    last_deploy_completed_at: deploy.value.lastSuccessAt || '0',
  }))

  function getResource(id: ResourceId): Resource | undefined {
    return resourceMap.value[id]
  }

  function getProgress(resourceId: ResourceId): string {
    const status = download.value
    const isCurrent = status.currentId === resourceId
    const isCompleted = status.completedIds.includes(resourceId)
    const isFailed = status.failedIds.includes(resourceId)

    if (isCurrent) {
      if (status.currentState === 'checking') return status.currentDetail ? `检查更新来源：${status.currentDetail}` : '检查更新来源...'
      if (status.currentState === 'downloading') return status.currentDetail ? `下载中：${status.currentDetail}` : '下载中...'
      if (status.currentState === 'extracting') return status.currentDetail ? `解压中：${status.currentDetail}` : '解压中...'
      if (status.currentState === 'done') return status.currentDetail ? `完成：${status.currentDetail}` : '完成'
      if (status.currentState === 'error') return status.currentDetail ? `失败：${status.currentDetail}` : '失败'
    }

    if (isFailed) return '失败'
    if (isCompleted) return '完成'
    return ''
  }

  function isDownloading(resourceId: ResourceId): boolean {
    const status = download.value
    if (status.state !== 'running') return false
    if (status.mode === 'bulk') return true
    return status.currentId === resourceId
  }

  function canRetry(resourceId: ResourceId): boolean {
    return download.value.failedIds.includes(resourceId) || (download.value.state === 'error' && download.value.currentId === resourceId)
  }

  async function syncStatus(force = false) {
    const next = await refresh(force)
    if (hasActiveTask(next)) {
      startPolling()
    }
    return next
  }

  async function resumeTasks() {
    return syncStatus(true)
  }

  async function startResourceDownload(resourceId: ResourceId) {
    await yieldToUiPaint()
    await startDownloadTask(resourceId)
    await syncStatus(true)
  }

  async function startEnabledResourceDownload() {
    await yieldToUiPaint()
    await startDownloadEnabledTask()
    await syncStatus(true)
  }

  function isBulkDownloading(): boolean {
    return download.value.state === 'running' && download.value.mode === 'bulk'
  }

  return {
    snapshot: readonly(snapshot),
    loading: readonly(loading),
    error: readonly(error),
    polling: readonly(polling),
    config,
    resources,
    download,
    deploy,
    targetApps,
    targetCount,
    enabledResourceCount,
    installedResourceCount,
    isDownloadingAny,
    downloadError,
    isDeploying,
    updateStatus,
    refresh,
    syncAndMaybeStop,
    syncStatus,
    resumeTasks,
    startPolling,
    stopPolling,
    startResourceDownload,
    startEnabledResourceDownload,
    getResource,
    getProgress,
    isDownloading,
    isBulkDownloading,
    canRetry,
  }
}
