import type { Resource } from '@/lib/types'

interface Props {
  resource: Resource
  progress: string
  busy: boolean
  downloading: boolean
  onToggle: (enabled: boolean) => void
  onDownload: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function ResourceCard(props: Props) {
  return (
    <md-outlined-card class="card list-card resource-card">
      <div class="row-between list-card-head">
        <div class="meta-stack">
          <div class="item-title">{props.resource.name}</div>
          <a class="item-meta" href={`https://github.com/${props.resource.repo}`} target="_blank" rel="noopener">
            {props.resource.repo}
          </a>
        </div>
        <div class="switch-wrap">
          <span>启用</span>
          <md-switch
            selected={props.resource.enabled}
            disabled={props.busy}
            onChange={(e: Event) => props.onToggle((e.currentTarget as { selected?: boolean }).selected === true)}
          ></md-switch>
        </div>
      </div>

      <div class="supporting-grid">
        <div>
          <div class="label">当前版本</div>
          <div class="item-meta">{props.resource.version || '未安装'}</div>
        </div>
        <div>
          <div class="label">本地状态</div>
          <div class="item-meta">{props.resource.installed ? '已下载' : '未下载'}</div>
        </div>
        <div>
          <div class="label">合并顺序</div>
          <div class="item-meta">{props.resource.order}</div>
        </div>
        <div>
          <div class="label">任务进度</div>
          <div class="item-meta">{props.progress || '空闲'}</div>
        </div>
      </div>

      <md-outlined-button
        class="action-btn card-action"
        disabled={props.busy || props.downloading || !props.resource.enabled}
        onClick={props.onDownload}
      >
        {props.downloading ? '下载中...' : (props.resource.installed ? '重新下载' : '下载')}
      </md-outlined-button>

      <div class="resource-card-actions">
        <md-text-button class="action-btn" disabled={props.busy} onClick={props.onEdit}>编辑</md-text-button>
        <md-text-button class="action-btn danger-action" disabled={props.busy} onClick={props.onDelete}>删除</md-text-button>
      </div>
    </md-outlined-card>
  )
}
