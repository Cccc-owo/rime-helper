import StatusBanner from '@/components/StatusBanner'
import SurfaceSection from '@/components/SurfaceSection'
import { clearCache, saveTargetApps, state, targetAppSet } from '@/store/appStore'

export default function SettingsPage() {
  const targetSet = () => targetAppSet()

  const isSelected = (pkg: string) => {
    const set = targetSet()
    if (set.size === 0) return true
    return set.has(pkg)
  }

  async function toggleTarget(pkg: string, checked: boolean) {
    const set = targetSet()
    if (checked) set.add(pkg)
    else set.delete(pkg)
    await saveTargetApps(Array.from(set))
  }

  return (
    <div class="page">
      <h1>设置</h1>
      <p class="desc">配置同步目标与维护选项。</p>

      <StatusBanner message={state.message} error={state.error} />

      <SurfaceSection title="目标应用">
        <div class="label">未选择时默认同步到全部应用</div>
        <md-list>
          {state.apps.map((app, index) => (
            <>
              <md-list-item headline={app.label} supportingText={app.package}>
                <md-switch
                  slot="end"
                  selected={isSelected(app.package)}
                  onChange={(e: Event) => void toggleTarget(app.package, (e.currentTarget as { selected?: boolean }).selected === true)}
                ></md-switch>
              </md-list-item>
              {index < state.apps.length - 1 ? <md-divider inset></md-divider> : null}
            </>
          ))}
          {state.appsLoading ? <div class="empty">正在检测输入法应用...</div> : null}
          {!state.appsLoading && state.apps.length === 0 ? <div class="empty">未检测到可用输入法应用</div> : null}
        </md-list>
      </SurfaceSection>

      <SurfaceSection title="维护">
        <div class="label">清理下载缓存，不影响已同步数据</div>
        <md-outlined-button class="action-btn danger-outlined" onClick={() => void clearCache()}>清除下载缓存</md-outlined-button>
      </SurfaceSection>
    </div>
  )
}
