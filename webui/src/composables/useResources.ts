// useResources.ts — Resource download state management
import { ref, readonly } from 'vue'
import type { DownloadTaskStatus, ResourceId, ResourceProgress, ResourceProgressState } from '@/types'
import { getDownloadTaskStatus, startDownloadEnabledTask, startDownloadTask } from '@/api/commands'

const progress = ref<ResourceProgress[]>([])
const downloading = ref(false)
const currentResourceId = ref<ResourceId | null>(null)
const bulkDownloading = ref(false)
const error = ref<string | null>(null)
let pollTimer: ReturnType<typeof setInterval> | null = null
let lastTaskFingerprint = ''

function updateProgress(id: ResourceId, state: ResourceProgressState, detail: string) {
  const existing = progress.value.find(p => p.id === id)
  const entry: ResourceProgress = { id, state, detail }
  if (existing) {
    Object.assign(existing, entry)
  } else {
    progress.value.push(entry)
  }
}

function formatProgressText(p: ResourceProgress): string {
  if (p.state === 'idle') return ''

  const detail = p.detail?.trim() ?? ''
  if (p.state === 'checking') {
    return detail ? `检查更新来源：${detail}` : '检查更新来源...'
  }
  if (p.state === 'downloading') {
    return detail ? `下载中：${detail}` : '下载中...'
  }
  if (p.state === 'extracting') {
    return detail ? `解压中：${detail}` : '解压中...'
  }
  if (p.state === 'done') {
    if (detail.startsWith('Already up to date')) {
      const normalized = detail.replace('Already up to date', '已是最新版本')
      return `完成：${normalized}`
    }
    return detail ? `完成：${detail}` : '完成'
  }
  if (p.state === 'error') {
    return detail ? `失败：${detail}` : '失败'
  }
  return detail
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

function stopPolling() {
  if (!pollTimer) return
  clearInterval(pollTimer)
  pollTimer = null
}

function resetTaskTracking() {
  lastTaskFingerprint = ''
}

function applyTaskStatus(status: DownloadTaskStatus) {
  downloading.value = status.state === 'running'
  bulkDownloading.value = status.mode === 'bulk' && status.state === 'running'
  currentResourceId.value = status.mode === 'single' && status.state === 'running' ? status.currentId : null

  for (const id of status.completedIds) {
    const existing = progress.value.find(item => item.id === id)
    if (!existing || existing.state !== 'done') {
      updateProgress(id, 'done', existing?.detail || '完成')
    }
  }

  for (const id of status.failedIds) {
    const existing = progress.value.find(item => item.id === id)
    if (!existing || existing.state !== 'error') {
      updateProgress(id, 'error', existing?.detail || '失败')
    }
  }

  if (status.currentId) {
    updateProgress(status.currentId, status.currentState, status.currentDetail)
  }

  if (status.state === 'error') {
    error.value = status.error || status.currentDetail || '下载失败'
    if (status.currentId) {
      updateProgress(status.currentId, 'error', error.value)
    }
    stopPolling()
    currentResourceId.value = null
    bulkDownloading.value = false
    downloading.value = false
    return
  }

  if (status.state === 'success' || status.state === 'idle') {
    error.value = null
    stopPolling()
    currentResourceId.value = null
    bulkDownloading.value = false
    downloading.value = false
  }
}

async function loadTaskStatus() {
  const status = await getDownloadTaskStatus()
  const fingerprint = JSON.stringify(status)
  if (fingerprint === lastTaskFingerprint) return status
  lastTaskFingerprint = fingerprint
  applyTaskStatus(status)
  return status
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    loadTaskStatus().catch(e => {
      error.value = e instanceof Error ? e.message : String(e)
      downloading.value = false
      bulkDownloading.value = false
      currentResourceId.value = null
      stopPolling()
    })
  }, 1000)
}

async function resumeDownloadTask() {
  const status = await loadTaskStatus()
  if (status.state === 'running') {
    startPolling()
  }
  return status
}

export function useResources() {
  async function download(resourceId: ResourceId) {
    downloading.value = true
    bulkDownloading.value = false
    currentResourceId.value = resourceId
    error.value = null
    updateProgress(resourceId, 'checking', '')
    resetTaskTracking()
    await yieldToUiPaint()
    try {
      await startDownloadTask(resourceId)
      await resumeDownloadTask()
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      error.value = message
      updateProgress(resourceId, 'error', message)
      currentResourceId.value = null
      downloading.value = false
    }
  }

  async function downloadEnabled() {
    downloading.value = true
    bulkDownloading.value = true
    currentResourceId.value = null
    error.value = null
    resetTaskTracking()
    await yieldToUiPaint()
    try {
      await startDownloadEnabledTask()
      await resumeDownloadTask()
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      error.value = message
      downloading.value = false
      bulkDownloading.value = false
    }
  }

  function getProgress(rid: ResourceId): string {
    const p = progress.value.find(item => item.id === rid)
    if (!p) return ''
    return formatProgressText(p)
  }

  function isDownloading(rid: ResourceId): boolean {
    if (!downloading.value) return false
    if (bulkDownloading.value) return true
    return currentResourceId.value === rid
  }

  function isBulkDownloading(): boolean {
    return downloading.value && bulkDownloading.value
  }

  return {
    progress: readonly(progress),
    downloading: readonly(downloading),
    error: readonly(error),
    download,
    downloadEnabled,
    resumeDownloadTask,
    getProgress,
    isDownloading,
    isBulkDownloading,
    loadTaskStatus,
    startPolling,
    stopPolling,
  }
}
