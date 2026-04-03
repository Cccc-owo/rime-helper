import AppCard from '@/components/AppCard'
import SurfaceSection from '@/components/SurfaceSection'
import StatusBanner from '@/components/StatusBanner'
import UpdateCard from '@/components/UpdateCard'
import { checkUpdates, deployToApps, refreshLogs, state, toggleLogs, updateResources } from '@/store/appStore'

function formatTs(ts: string): string {
  if (!ts || ts === '0') return '从未'
  const date = new Date(Number(ts) * 1000)
  return date.toLocaleString('zh-CN')
}

export default function DeployPage() {
  const deployStateText = () => {
    const value = state.snapshot?.deploy.state ?? 'idle'
    if (value === 'running') return '同步中'
    if (value === 'success') return '成功'
    if (value === 'error') return '失败'
    return '空闲'
  }

  return (
    <div class="page">
      <h1>同步</h1>
      <p class="desc">检查更新、执行同步并查看日志。</p>

      <SurfaceSection title="状态概览">
        <div class="grid">
          <div><span class="label">检测到应用</span><b>{state.apps.length}</b></div>
          <div><span class="label">启用资源数</span><b>{state.snapshot?.summary.enabledResourceCount ?? 0}</b></div>
          <div><span class="label">上次下载完成</span><b>{formatTs(state.snapshot?.download.updatedAt ?? '0')}</b></div>
          <div><span class="label">上次同步完成</span><b>{formatTs(state.snapshot?.deploy.lastSuccessAt ?? '0')}</b></div>
          <div><span class="label">同步目标</span><b>{state.snapshot?.targetApps ? '已指定' : '全部应用'}</b></div>
          <div><span class="label">后端同步状态</span><b>{deployStateText()}</b></div>
        </div>

        {state.loading || state.appsLoading ? <div class="empty">加载中...</div> : null}
        {!state.loading && !state.appsLoading && state.apps.length === 0 ? <div class="empty">未检测到输入法应用</div> : null}
        {state.apps.map((app) => <AppCard app={app} />)}
      </SurfaceSection>

      <SurfaceSection title="更新">
        <div class="action-row">
          <md-filled-button class="action-btn" disabled={state.checkingUpdates} onClick={() => void checkUpdates()}>
            {state.checkingUpdates ? '检查中...' : '检查更新'}
          </md-filled-button>
          <md-outlined-button class="action-btn" disabled={state.updating} onClick={() => void updateResources()}>
            {state.updating ? '更新中...' : '全部更新'}
          </md-outlined-button>
        </div>

        <StatusBanner message={state.message} error={state.error} />

        {state.updates.length === 0 && !state.checkingUpdates ? <md-outlined-card class="card empty">暂无更新结果</md-outlined-card> : null}
        {state.updates.map((item) => (
          <UpdateCard item={item} updating={state.updating} onUpdate={() => void updateResources(item.id)} />
        ))}
      </SurfaceSection>

      <SurfaceSection title="文件同步">
        {state.snapshot?.deploy.detail || state.snapshot?.deploy.error || state.snapshot?.deploy.state !== 'idle' ? (
          <md-outlined-card class="card">
            <div class="label">后端任务状态</div>
            {state.snapshot?.deploy.detail ? <div>{state.snapshot.deploy.detail}</div> : null}
            {state.snapshot?.deploy.error ? <div class="error-text">{state.snapshot.deploy.error}</div> : null}
          </md-outlined-card>
        ) : null}

        <md-filled-button class="action-btn" disabled={state.updating || state.checkingUpdates} onClick={() => void deployToApps()}>
          {state.snapshot?.deploy.state === 'running' ? '同步中...' : '同步到数据目录'}
        </md-filled-button>
      </SurfaceSection>

      <SurfaceSection title="日志">
        <md-text-button class="action-btn" onClick={() => void toggleLogs()}>{state.logExpanded ? '收起日志' : '展开日志'}</md-text-button>
        {state.logExpanded ? (
          <md-outlined-card class="card log">
            <div class="row-between">
              <div class="label">{state.lastLogRefreshAt ? `上次刷新：${state.lastLogRefreshAt}` : ''}</div>
              <md-outlined-button class="action-btn" disabled={state.logLoading} onClick={() => void refreshLogs()}>
                {state.logLoading ? '刷新中...' : '刷新日志'}
              </md-outlined-button>
            </div>
            {state.logs ? <pre>{state.logs}</pre> : <div class="empty">尚无日志</div>}
          </md-outlined-card>
        ) : null}
      </SurfaceSection>
    </div>
  )
}
