import { createStore } from 'solid-js/store'
import { detectApps, getSnapshot, setConfig, getVersion, startDownload, startDownloadEnabled, deployAll, readLog, clearDownloadCache, addResource, removeResource, resetResources } from '@/lib/api'
import { fetchCommitSha, fetchReleaseTag } from '@/lib/github'
import { parseStrategy } from '@/lib/strategy'
import { uiStore } from '@/lib/stores/uiStore'
import type { AppState, Resource, ResourceDef, ResourceId, RouteName, UpdateCheckResult } from '@/lib/types'

const initialState: AppState = {
  route: 'deploy',
  loading: false,
  appsLoading: false,
  snapshot: null,
  apps: [],
  updates: [],
  checkingUpdates: false,
  updating: false,
  message: '',
  error: '',
  logs: '',
  logExpanded: false,
  logLoading: false,
  lastLogRefreshAt: '',
}

const [state, setState] = createStore<AppState>(initialState)

let pollTimer: ReturnType<typeof setInterval> | null = null
let logTimer: ReturnType<typeof setInterval> | null = null

function setMessage(message: string) {
  setState({ message, error: '' })
  uiStore.showToast(message)
}

function setError(error: string) {
  setState({ error, message: '' })
  uiStore.showToast(error, 3000)
}

function clearFeedback() {
  setState({ message: '', error: '' })
}

function hasActiveTask(): boolean {
  const snapshot = state.snapshot
  if (!snapshot) return false
  return snapshot.download.state === 'running' || snapshot.deploy.state === 'running'
}

export async function refreshSnapshot(forceLoading = false) {
  if (forceLoading) setState('loading', true)
  try {
    const snapshot = await getSnapshot()
    setState({ snapshot, loading: false })
  } catch (e) {
    setState('loading', false)
    setError(e instanceof Error ? e.message : String(e))
  }
}

export async function loadApps() {
  setState('appsLoading', true)
  try {
    const apps = await detectApps()
    setState({ apps, appsLoading: false })
  } catch (e) {
    setState('appsLoading', false)
    setError(e instanceof Error ? e.message : String(e))
  }
}

export function setRoute(route: RouteName) {
  setState('route', route)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    void refreshSnapshot().then(() => {
      if (!hasActiveTask()) stopPolling()
    })
  }, 1000)
}

export async function initApp() {
  await Promise.all([refreshSnapshot(true), loadApps()])
  if (hasActiveTask()) startPolling()
}

async function checkSingleUpdate(resource: Resource): Promise<UpdateCheckResult> {
  const current = await getVersion(resource.id).catch(() => '')
  try {
    const parsed = parseStrategy(resource.strategy)
    const latest = parsed.type === 'archive'
      ? await fetchCommitSha(resource.repo, parsed.tag ?? 'HEAD')
      : await fetchReleaseTag(resource.repo, parsed.tag)

    return {
      id: resource.id,
      current,
      latest,
      hasUpdate: Boolean(latest && latest !== current),
    }
  } catch (e) {
    return {
      id: resource.id,
      current,
      latest: '',
      hasUpdate: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

export async function checkUpdates(resourceId?: ResourceId) {
  clearFeedback()
  setState('checkingUpdates', true)
  try {
    const resources = (state.snapshot?.resources ?? []).filter(item => item.enabled)
    if (resourceId) {
      const target = resources.find(item => item.id === resourceId)
      if (!target) {
        setError(`资源 ${resourceId} 不存在或未启用`)
        return
      }
      const result = await checkSingleUpdate(target)
      setState('updates', (prev) => {
        const idx = prev.findIndex(item => item.id === resourceId)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = result
          return next
        }
        return [...prev, result]
      })
    } else {
      const results = await Promise.all(resources.map(checkSingleUpdate))
      setState('updates', results)
    }
    setMessage('检查更新完成')
  } finally {
    setState('checkingUpdates', false)
  }
}

async function waitForDownloadDone() {
  while (state.snapshot?.download.state === 'running') {
    await new Promise(resolve => setTimeout(resolve, 900))
    await refreshSnapshot()
  }
}

export async function updateResources(resourceId?: ResourceId) {
  clearFeedback()
  setState('updating', true)
  try {
    if (resourceId) {
      await startDownload(resourceId)
      setMessage(`已启动资源 ${resourceId} 下载`)
    } else {
      await startDownloadEnabled()
      setMessage('已启动全部启用资源下载')
    }

    await refreshSnapshot(true)
    startPolling()
    await waitForDownloadDone()
    await refreshSnapshot()

    if (state.snapshot?.download.state === 'error') {
      throw new Error(state.snapshot.download.error || '下载任务失败')
    }

    setMessage('下载任务已完成')
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  } finally {
    setState('updating', false)
  }
}

export async function deployToApps() {
  clearFeedback()
  try {
    await deployAll()
    setMessage('已提交同步任务')
    await refreshSnapshot(true)
    startPolling()
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  }
}

export async function toggleResourceEnabled(resource: Resource, enabled: boolean) {
  clearFeedback()
  try {
    await setConfig(`resource_${resource.id}_enabled`, String(enabled))
    await refreshSnapshot(true)
    setMessage(enabled ? `已启用 ${resource.name}` : `已停用 ${resource.name}`)
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  }
}

export async function saveTargetApps(nextApps: string[]) {
  clearFeedback()
  try {
    await setConfig('target_apps', nextApps.join(','))
    await refreshSnapshot(true)
    setMessage('已更新同步目标应用')
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  }
}

export async function clearCache() {
  clearFeedback()
  try {
    await clearDownloadCache()
    setMessage('已清除下载缓存')
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  }
}

export async function createOrUpdateResource(def: ResourceDef) {
  clearFeedback()
  try {
    await addResource(def)
    await refreshSnapshot(true)
    setMessage(`已保存资源 ${def.name}`)
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  }
}

export async function deleteResource(resource: Resource) {
  clearFeedback()
  try {
    await removeResource(resource.id)
    await refreshSnapshot(true)
    setMessage(`已删除资源 ${resource.name}`)
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  }
}

export async function restoreDefaultResources() {
  clearFeedback()
  try {
    await resetResources()
    await refreshSnapshot(true)
    setMessage('已恢复默认资源列表')
  } catch (e) {
    setError(e instanceof Error ? e.message : String(e))
  }
}

export async function refreshLogs() {
  setState('logLoading', true)
  try {
    const logs = await readLog()
    setState({ logs, logLoading: false, lastLogRefreshAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }) })
  } catch {
    setState({ logs: '无法读取日志', logLoading: false })
  }
}

export async function toggleLogs() {
  const next = !state.logExpanded
  setState('logExpanded', next)
  if (next) {
    await refreshLogs()
    if (!logTimer) {
      logTimer = setInterval(() => {
        void refreshLogs()
      }, 5000)
    }
  } else if (logTimer) {
    clearInterval(logTimer)
    logTimer = null
  }
}

export function disposeAppStore() {
  stopPolling()
  if (logTimer) {
    clearInterval(logTimer)
    logTimer = null
  }
}

export function enabledResources(): Resource[] {
  return (state.snapshot?.resources ?? []).filter(resource => resource.enabled)
}

export function targetAppSet(): Set<string> {
  const value = state.snapshot?.targetApps ?? ''
  return new Set(value.split(',').map(item => item.trim()).filter(Boolean))
}

export { state }
