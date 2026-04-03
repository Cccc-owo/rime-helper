import type { RimeApp } from '@/lib/types'

export default function AppCard(props: { app: RimeApp }) {
  return (
    <md-outlined-card class="card list-card">
      <div class="row-between list-card-head">
        <div class="meta-stack">
          <div class="item-title">{props.app.label}</div>
          <div class="item-meta">{props.app.package}</div>
        </div>
        <md-assist-chip class={props.app.rime_dir_exists ? 'status-chip status-chip-ok' : 'status-chip'} label={props.app.rime_dir_exists ? '已配置' : '未配置'}></md-assist-chip>
      </div>
      <div class="supporting-block">
        <div class="label">数据目录</div>
        <div class="item-meta mono">{props.app.rime_path}</div>
      </div>
    </md-outlined-card>
  )
}
