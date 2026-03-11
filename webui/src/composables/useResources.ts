import type { ResourceId } from '@/types'
import { useAppState } from '@/composables/useAppState'

export function useResources() {
  const appState = useAppState()

  async function resumeDownloadTask() {
    const snapshot = await appState.resumeTasks()
    return snapshot.download
  }

  async function download(resourceId: ResourceId) {
    await appState.startResourceDownload(resourceId)
  }

  async function downloadEnabled() {
    await appState.startEnabledResourceDownload()
  }

  return {
    downloading: appState.isDownloadingAny,
    error: appState.downloadError,
    download,
    downloadEnabled,
    resumeDownloadTask,
    getProgress: appState.getProgress,
    isDownloading: appState.isDownloading,
    isBulkDownloading: appState.isBulkDownloading,
    loadTaskStatus: appState.syncStatus,
    startPolling: appState.startPolling,
    stopPolling: appState.stopPolling,
  }
}
