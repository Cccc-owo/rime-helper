// useUpdate.ts — Update check and deploy state
import { ref, readonly } from 'vue'
import type { UpdateCheckResult, UpdateStatus, ResourceId } from '@/types'
import { checkResourceUpdate, checkAllUpdates, downloadResource, getEnabledResourceIds } from '@/api/resources'
import { configGet, configSet, deployAll } from '@/api/commands'

const updates = ref<UpdateCheckResult[]>([])
const status = ref<UpdateStatus | null>(null)
const checking = ref(false)
const updating = ref(false)
const deploying = ref(false)
const error = ref<string | null>(null)

export function useUpdate() {
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
        await downloadResource(resourceId)
      } else {
        for (const rid of await getEnabledResourceIds()) {
          await downloadResource(rid).catch(() => {})
        }
      }
      await configSet('last_update', String(Math.floor(Date.now() / 1000)))
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      updating.value = false
    }
  }

  async function deployToApps() {
    deploying.value = true
    error.value = null
    try {
      await deployAll()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      deploying.value = false
    }
  }

  async function loadStatus() {
    try {
      const lastUpdate = await configGet('last_update', '0')
      status.value = {
        last_update: lastUpdate,
      }
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
