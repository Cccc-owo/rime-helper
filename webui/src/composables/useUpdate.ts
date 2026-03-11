// useUpdate.ts — Update check and deploy state
import { ref, readonly } from 'vue'
import type { UpdateCheckResult, ResourceId } from '@/types'
import { checkResourceUpdate, checkAllUpdates } from '@/api/resources'
import { deployAll } from '@/api/commands'
import { useAppState } from '@/composables/useAppState'

const updates = ref<UpdateCheckResult[]>([])
const checking = ref(false)
const updating = ref(false)
const error = ref<string | null>(null)

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function useUpdate() {
  const appState = useAppState()
  const deploying = appState.isDeploying
  const status = appState.updateStatus

  async function waitForUpdateTaskCompletion() {
    while (appState.isDownloadingAny.value) {
      await wait(1000)
      await appState.syncAndMaybeStop()
    }
  }

  async function finalizeUpdateTask() {
    await appState.refresh(true)
    if (appState.downloadError.value) {
      error.value = appState.downloadError.value
      return
    }
    error.value = null
  }

  async function check(resourceId?: ResourceId) {
    checking.value = true
    error.value = null
    try {
      if (resourceId) {
        const result = await checkResourceUpdate(resourceId)
        const idx = updates.value.findIndex(u => u.id === resourceId)
        if (idx >= 0) updates.value[idx] = result
        else updates.value.push(result)
      } else {
        updates.value = await checkAllUpdates()
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      checking.value = false
    }
  }

  async function update(resourceId?: ResourceId) {
    updating.value = true
    error.value = null
    try {
      if (resourceId) {
        await appState.startResourceDownload(resourceId)
      } else {
        await appState.startEnabledResourceDownload()
      }

      await waitForUpdateTaskCompletion()
      await finalizeUpdateTask()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      updating.value = false
    }
  }

  async function deployToApps() {
    error.value = null
    try {
      await deployAll()
      const snapshot = await appState.refresh(true)
      if (snapshot.deploy.state === 'running') {
        appState.startPolling()
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  async function loadStatus() {
    try {
      await appState.refresh(true)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  return {
    updates: readonly(updates),
    status: readonly(status),
    checking: readonly(checking),
    updating: readonly(updating),
    deploying: readonly(deploying),
    error: readonly(error),
    check,
    update,
    deployToApps,
    loadStatus,
  }
}
