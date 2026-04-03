import type { UpdateCheckResult } from '@/lib/types'

interface Props {
  item: UpdateCheckResult
  busy: boolean
  onUpdate: () => void
}

export default function UpdateCard(props: Props) {
  const status = props.item.error ? '检查失败' : props.item.hasUpdate ? '可更新' : '最新'

  return (
    <md-outlined-card class="card list-card">
      <div class="row-between list-card-head">
        <div class="meta-stack">
          <div class="item-title">{props.item.id}</div>
          <div class="item-meta">{props.item.error ? '版本检查失败' : 'GitHub 版本比对结果'}</div>
        </div>
        <md-assist-chip class={props.item.hasUpdate ? 'status-chip status-chip-accent' : 'status-chip'} label={status}></md-assist-chip>
      </div>

      <div class="supporting-grid">
        <div>
          <div class="label">当前</div>
          <div class="item-meta">{props.item.current || '未安装'}</div>
        </div>
        <div>
          <div class="label">最新</div>
          <div class="item-meta">{props.item.latest || '未知'}</div>
        </div>
      </div>

      {props.item.error ? <div class="error-text">{props.item.error}</div> : null}
      {props.item.hasUpdate && !props.item.error ? (
        <md-filled-button class="action-btn card-action" disabled={props.busy} onClick={props.onUpdate}>
          {props.busy ? '更新中...' : '更新'}
        </md-filled-button>
      ) : null}
    </md-outlined-card>
  )
}
