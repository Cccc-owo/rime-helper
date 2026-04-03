import { createSignal } from 'solid-js'
import AddResourceForm from '@/components/AddResourceForm'
import ResourceCard from '@/components/ResourceCard'
import SurfaceSection from '@/components/SurfaceSection'
import StatusBanner from '@/components/StatusBanner'
import { checkUpdates, createOrUpdateResource, deleteResource, isBackendTaskRunning, restoreDefaultResources, state, toggleResourceEnabled, updateResources } from '@/store/appStore'
import type { Resource } from '@/lib/types'

const CATEGORY_LABELS: Record<string, string> = {
  schema: '方案',
  dict: '词库',
  model: '模型',
}

export default function ResourcesPage() {
  const [showForm, setShowForm] = createSignal(false)
  const [editing, setEditing] = createSignal<Resource | null>(null)
  const [filterCategory, setFilterCategory] = createSignal('all')
  const [sortBy, setSortBy] = createSignal<'order' | 'name'>('order')

  const resources = () => state.snapshot?.resources ?? []
  const busy = () => isBackendTaskRunning()

  const grouped = () => {
    const source = resources()
      .filter((resource) => filterCategory() === 'all' || (resource.category ?? 'other') === filterCategory())
      .slice()

    source.sort((a, b) => {
      if (sortBy() === 'name') return a.name.localeCompare(b.name, 'zh-CN')
      return a.order - b.order
    })

    const map = new Map<string, Resource[]>()
    for (const resource of source) {
      const key = resource.category ?? 'other'
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(resource)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({ key, label: CATEGORY_LABELS[key] ?? '其他', items }))
  }

  const progressText = (id: string) => {
    const d = state.snapshot?.download
    if (!d) return ''
    if (d.currentId === id) {
      if (d.currentState === 'checking') return d.currentDetail ? `检查：${d.currentDetail}` : '检查中...'
      if (d.currentState === 'downloading') return d.currentDetail ? `下载：${d.currentDetail}` : '下载中...'
      if (d.currentState === 'extracting') return d.currentDetail ? `解压：${d.currentDetail}` : '解压中...'
      if (d.currentState === 'error') return d.currentDetail ? `失败：${d.currentDetail}` : '失败'
      if (d.currentState === 'done') return d.currentDetail ? `完成：${d.currentDetail}` : '完成'
    }
    if (d.failedIds.includes(id)) return '失败'
    if (d.completedIds.includes(id)) return '完成'
    return ''
  }

  return (
    <div class="page">
      <h1>资源</h1>

      <SurfaceSection tone="filled" class="muted">
        本页仅管理资源，不执行文件同步。
      </SurfaceSection>
      <StatusBanner message={state.message} error={state.error} />

      <SurfaceSection title="操作">
        <div class="field-row">
          <div class="field">
            <label>分类筛选</label>
            <md-outlined-select value={filterCategory()} onInput={(e: Event) => setFilterCategory((e.currentTarget as { value?: string }).value ?? 'all')}>
              <md-select-option value="all" selected={filterCategory() === 'all'}>全部</md-select-option>
              <md-select-option value="schema" selected={filterCategory() === 'schema'}>方案</md-select-option>
              <md-select-option value="dict" selected={filterCategory() === 'dict'}>词库</md-select-option>
              <md-select-option value="model" selected={filterCategory() === 'model'}>模型</md-select-option>
              <md-select-option value="other" selected={filterCategory() === 'other'}>其他</md-select-option>
            </md-outlined-select>
          </div>
          <div class="field">
            <label>排序方式</label>
            <md-outlined-select value={sortBy()} onInput={(e: Event) => setSortBy(((e.currentTarget as { value?: string }).value ?? 'order') as 'order' | 'name')}>
              <md-select-option value="order" selected={sortBy() === 'order'}>按 order</md-select-option>
              <md-select-option value="name" selected={sortBy() === 'name'}>按名称</md-select-option>
            </md-outlined-select>
          </div>
        </div>

        <div class="action-row">
          <md-outlined-button class="action-btn" disabled={state.checkingUpdates || busy()} onClick={() => void checkUpdates()}>
            {state.checkingUpdates ? '检查中...' : '检查更新'}
          </md-outlined-button>
          <md-filled-button class="action-btn" disabled={state.updating || busy()} onClick={() => void updateResources()}>
            {state.updating ? '下载中...' : '下载全部启用资源'}
          </md-filled-button>
        </div>

        <div class="action-row">
          {!showForm() && !editing() ? (
            <md-filled-tonal-button class="action-btn" disabled={busy()} onClick={() => { setEditing(null); setShowForm(true) }}>+ 添加资源</md-filled-tonal-button>
          ) : null}
          <md-outlined-button
            class="action-btn danger-outlined"
            disabled={busy()}
            onClick={() => {
              if (!confirm('确定恢复默认资源列表吗？这会覆盖当前 resources.conf')) return
              void restoreDefaultResources()
            }}
          >
            恢复默认资源
          </md-outlined-button>
        </div>
      </SurfaceSection>

      {showForm() || editing() ? (
        <AddResourceForm
          disabled={busy()}
          existingIds={resources().map(item => item.id)}
          initial={editing()}
          onCancel={() => { setShowForm(false); setEditing(null) }}
          onSubmit={(def) => {
            void createOrUpdateResource(def)
            setShowForm(false)
            setEditing(null)
          }}
        />
      ) : null}

      {grouped().map((group) => (
        <section class="resource-group">
          <h2>{group.label}</h2>
          {group.items.map((resource) => (
            <ResourceCard
              resource={resource}
              progress={progressText(resource.id)}
              busy={busy()}
              downloading={state.snapshot?.download.state === 'running' && (state.snapshot.download.mode === 'bulk' || state.snapshot.download.currentId === resource.id)}
              onToggle={(enabled) => void toggleResourceEnabled(resource, enabled)}
              onDownload={() => void updateResources(resource.id)}
              onEdit={() => { setShowForm(false); setEditing(resource) }}
              onDelete={() => {
                if (!confirm(`确定删除资源 ${resource.name} 吗？`)) return
                void deleteResource(resource)
              }}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
