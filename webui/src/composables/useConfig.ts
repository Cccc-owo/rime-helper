import { configSet } from '@/api/commands'
import type { ResourceId } from '@/types'
import { useAppState } from '@/composables/useAppState'

export function useConfig() {
  const appState = useAppState()

  async function load() {
    await appState.refresh(true)
  }

  async function setTargetApps(apps: string) {
    await configSet('target_apps', apps)
    await appState.refresh(true)
  }

  async function setResourceEnabled(resourceId: ResourceId, enabled: boolean) {
    await configSet(`resource_${resourceId}_enabled`, String(enabled))
    await appState.refresh(true)
  }

  return {
    config: appState.config,
    loading: appState.loading,
    error: appState.error,
    load,
    setTargetApps,
    setResourceEnabled,
  }
}
