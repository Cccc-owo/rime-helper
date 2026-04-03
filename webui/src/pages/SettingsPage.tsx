import StatusBanner from '@/components/StatusBanner'
import SurfaceSection from '@/components/SurfaceSection'
import { clearCache, isBackendTaskRunning, saveTargetApps, state, targetAppSet } from '@/store/appStore'

export default function SettingsPage() {
  const targetSet = () => targetAppSet()
  const allPackages = () => state.apps.map(app => app.package)

  const isSelected = (pkg: string) => {
    const set = targetSet()
    if (set.size === 0) return true
    return set.has(pkg)
  }

  async function toggleTarget(pkg: string, checked: boolean) {
    const current = targetSet()
    const next = current.size === 0 ? new Set(allPackages()) : new Set(current)

    if (checked) next.add(pkg)
    else next.delete(pkg)

    const normalized = next.size === allPackages().length ? [] : Array.from(next)
    await saveTargetApps(normalized)
  }

  return (
    <div class="page">
      <h1>设置</h1>

      <StatusBanner message={state.message} error={state.error} />

      <SurfaceSection title="目标应用">
        <div class="label">未选择时默认同步到全部应用</div>
        {state.appsLoading ? <div class="empty">正在检测输入法应用...</div> : null}
        {!state.appsLoading && state.apps.length === 0 ? <div class="empty">未检测到可用输入法应用</div> : null}
        <div class="settings-list">
          {state.apps.map((app) => (
            <div class="settings-item">
              <div class="settings-meta">
                <div class="item-title">{app.label}</div>
                <div class="item-meta">{app.package}</div>
              </div>
              <md-switch
                selected={isSelected(app.package)}
                disabled={isBackendTaskRunning()}
                onChange={(e: Event) => void toggleTarget(app.package, (e.currentTarget as { selected?: boolean }).selected === true)}
              ></md-switch>
            </div>
          ))}
        </div>
      </SurfaceSection>

      <SurfaceSection title="维护">
        <div class="settings-item maintenance-item">
          <div class="settings-meta">
            <div class="item-title">清除下载缓存</div>
            <div class="item-meta">不影响已同步数据</div>
          </div>
          <md-outlined-button class="danger-outlined" disabled={isBackendTaskRunning()} onClick={() => void clearCache()}>清除</md-outlined-button>
        </div>
      </SurfaceSection>
    </div>
  )
}
