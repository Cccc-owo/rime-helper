import type { Resource } from '@/lib/types'

interface Props {
  resource: Resource
  progress: string
  downloading: boolean
  onToggle: (enabled: boolean) => void
  onDownload: () => void
}

export default function ResourceCard(props: Props) {
  return (
    <md-outlined-card class="card">
      <div class="row-between">
        <div>
          <div class="item-title">{props.resource.name}</div>
          <a class="item-meta" href={`https://github.com/${props.resource.repo}`} target="_blank" rel="noopener">
            {props.resource.repo}
          </a>
        </div>
        <div class="switch-wrap">
          <span>启用</span>
          <md-switch
            selected={props.resource.enabled}
            onChange={(e: Event) => props.onToggle((e.currentTarget as { selected?: boolean }).selected === true)}
          ></md-switch>
        </div>
      </div>

      <div class="row-between gap-top">
        <div class="item-meta">
          {props.resource.version || '未安装'}
          {props.resource.installed ? ' · 已下载' : ''}
        </div>
        <div class="item-meta">{props.progress}</div>
      </div>

      <md-outlined-button
        class="action-btn"
        disabled={props.downloading || !props.resource.enabled}
        onClick={props.onDownload}
      >
        {props.downloading ? '下载中...' : (props.resource.installed ? '重新下载' : '下载')}
      </md-outlined-button>
    </md-outlined-card>
  )
}
