// useConfig.ts — Reactive config state
import { ref, readonly } from 'vue'
import type { AppConfig, Resource, ResourceId } from '@/types'
import { configGet, configSet, getVersion } from '@/api/commands'
import { loadResources } from '@/api/resources'

const config = ref<AppConfig | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

export function useConfig() {
  async function load() {
    loading.value = true
    error.value = null
    try {
      const [targetApps, resourceDefs] = await Promise.all([
        configGet('target_apps', ''),
        loadResources(),
      ])

      // Build resources array from definitions + config
      const resources: Resource[] = await Promise.all(
        resourceDefs.map(async def => {
          const defaultEnabled = def.id === 'rime-ice' ? 'true' : 'false'
          const [enabled, version] = await Promise.all([
            configGet(`resource_${def.id}_enabled`, defaultEnabled),
            getVersion(def.id),
          ])
          return { ...def, enabled: enabled === 'true', version }
        }),
      )

      config.value = {
        target_apps: targetApps,
        resources,
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function setTargetApps(apps: string) {
    await configSet('target_apps', apps)
    if (config.value) config.value.target_apps = apps
  }

  async function setResourceEnabled(resourceId: ResourceId, enabled: boolean) {
    await configSet(`resource_${resourceId}_enabled`, String(enabled))
    if (config.value) {
      const res = config.value.resources.find((r: Resource) => r.id === resourceId)
      if (res) res.enabled = enabled
    }
  }

  return {
    config: readonly(config),
    loading: readonly(loading),
    error: readonly(error),
    load,
    setTargetApps,
    setResourceEnabled,
  }
}
