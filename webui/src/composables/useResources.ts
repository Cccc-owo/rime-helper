// useResources.ts — Resource download state management
import { ref, readonly } from 'vue'
import type { ResourceProgress, ResourceId } from '@/types'
import {
  downloadResource,
  downloadAllEnabled,
} from '@/api/resources'

const progress = ref<ResourceProgress[]>([])
const downloading = ref(false)
const currentResourceId = ref<ResourceId | null>(null)
const bulkDownloading = ref(false)
const error = ref<string | null>(null)

function updateProgress(id: ResourceId, state: string, detail: string) {
  const existing = progress.value.find(p => p.id === id)
  const entry: ResourceProgress = {
    id,
    state: state as ResourceProgress['state'],
    detail,
  }
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

export function useResources() {
  async function download(resourceId: ResourceId) {
    downloading.value = true
    bulkDownloading.value = false
    currentResourceId.value = resourceId
    error.value = null
    await yieldToUiPaint()
    try {
      await downloadResource(resourceId, (id, state, detail) => {
        updateProgress(id, state, detail)
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      error.value = message
      updateProgress(resourceId, 'error', message)
    } finally {
      currentResourceId.value = null
      downloading.value = false
    }
  }

  async function downloadEnabled() {
    downloading.value = true
    bulkDownloading.value = true
    currentResourceId.value = null
    error.value = null
    await yieldToUiPaint()
    try {
      await downloadAllEnabled((id, state, detail) => {
        updateProgress(id, state, detail)
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      bulkDownloading.value = false
      downloading.value = false
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
    getProgress,
    isDownloading,
    isBulkDownloading,
  }
}
