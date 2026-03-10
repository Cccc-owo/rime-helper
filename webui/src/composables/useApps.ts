// useApps.ts — Installed Rime apps state
import { ref, readonly } from 'vue'
import type { RimeApp } from '@/types'
import { detectApps } from '@/api/commands'

const apps = ref<RimeApp[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export function useApps() {
  async function load() {
    loading.value = true
    error.value = null
    try {
      apps.value = await detectApps()
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  return {
    apps: readonly(apps),
    loading: readonly(loading),
    error: readonly(error),
    load,
  }
}
