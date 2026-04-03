import type { UpdateCheckResult } from '@/lib/types'

interface Props {
  item: UpdateCheckResult
  updating: boolean
  onUpdate: () => void
}

export default function UpdateCard(props: Props) {
  const status = props.item.error ? '检查失败' : props.item.hasUpdate ? '可更新' : '最新'

  return (
    <md-outlined-card class="card">
      <div class="row-between">
        <div class="item-title">{props.item.id}</div>
        <md-assist-chip label={status}></md-assist-chip>
      </div>
      <div class="item-meta">当前: {props.item.current || '未安装'}</div>
      {props.item.latest ? <div class="item-meta">最新: {props.item.latest}</div> : null}
      {props.item.error ? <div class="error-text">{props.item.error}</div> : null}
      {props.item.hasUpdate && !props.item.error ? (
        <md-filled-button class="action-btn" disabled={props.updating} onClick={props.onUpdate}>
          {props.updating ? '更新中...' : '更新'}
        </md-filled-button>
      ) : null}
    </md-outlined-card>
  )
}
