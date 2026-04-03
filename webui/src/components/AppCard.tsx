import type { RimeApp } from '@/lib/types'

export default function AppCard(props: { app: RimeApp }) {
  return (
    <md-outlined-card class="card">
      <div class="row-between">
        <div>
          <div class="item-title">{props.app.label}</div>
          <div class="item-meta">{props.app.package}</div>
        </div>
        <md-assist-chip label={props.app.rime_dir_exists ? '已配置' : '未配置'}></md-assist-chip>
      </div>
      <div class="item-meta mono">{props.app.rime_path}</div>
    </md-outlined-card>
  )
}
