import { createEffect, createMemo, createSignal } from 'solid-js'
import { buildStrategy, parseStrategy } from '@/lib/strategy'
import type { Resource, ResourceDef } from '@/lib/types'

interface Props {
  existingIds: string[]
  initial?: Resource | null
  disabled?: boolean
  onCancel: () => void
  onSubmit: (def: ResourceDef) => void
}

export default function AddResourceForm(props: Props) {
  const [repo, setRepo] = createSignal('')
  const [name, setName] = createSignal('')
  const [strategyType, setStrategyType] = createSignal('zipball')
  const [strategyPattern, setStrategyPattern] = createSignal('')
  const [strategyTag, setStrategyTag] = createSignal('')
  const [category, setCategory] = createSignal('schema')
  const [order, setOrder] = createSignal('50')
  const [error, setError] = createSignal('')

  const isEdit = createMemo(() => Boolean(props.initial))
  const needsPattern = createMemo(() => strategyType() === 'asset' || strategyType() === 'asset-files')

  createEffect(() => {
    const current = props.initial
    if (!current) {
      setRepo('')
      setName('')
      setStrategyType('zipball')
      setStrategyPattern('')
      setStrategyTag('')
      setCategory('schema')
      setOrder('50')
      return
    }

    const parsed = parseStrategy(current.strategy)
    setRepo(current.repo)
    setName(current.name)
    setStrategyType(parsed.type)
    setStrategyPattern(parsed.pattern ?? '')
    setStrategyTag(parsed.tag ?? '')
    setCategory(current.category ?? 'schema')
    setOrder(String(current.order))
  })

  function parseRepo(input: string): string {
    const match = input.trim().match(/(?:github\.com\/)?([^\/\s]+\/[^\/\s]+?)(?:\.git)?$/)
    return match ? match[1] : input.trim()
  }

  function submit() {
    setError('')
    const normalizedRepo = parseRepo(repo())
    if (!normalizedRepo || !normalizedRepo.includes('/')) {
      setError('请输入有效仓库（owner/repo 或 GitHub URL）')
      return
    }

    const repoName = normalizedRepo.split('/')[1]
    const nextId = props.initial?.id ?? repoName.toLowerCase()
    const nextName = name().trim() || repoName

    const duplicate = props.existingIds.includes(nextId) && nextId !== props.initial?.id
    if (duplicate) {
      setError(`资源 id ${nextId} 已存在`)
      return
    }

    if (needsPattern() && !strategyPattern().trim()) {
      setError('该策略必须填写匹配规则')
      return
    }

    const parsedOrder = Number.parseInt(order().trim(), 10)
    if (!Number.isFinite(parsedOrder)) {
      setError('请输入有效的顺序值')
      return
    }

    const payload: ResourceDef = {
      id: nextId,
      name: nextName,
      repo: normalizedRepo,
      strategy: buildStrategy(strategyType(), strategyPattern(), strategyTag()),
      order: parsedOrder,
      category: category(),
    }
    props.onSubmit(payload)
  }

  return (
    <md-outlined-card class="card form-card">
      <div class="form-head">
        <h3>{isEdit() ? '编辑资源' : '添加资源'}</h3>
      </div>

      <div class="form-section">
        <div class="field">
          <label>GitHub 仓库</label>
          <md-outlined-text-field disabled={props.disabled} value={repo()} onInput={(e: InputEvent) => setRepo((e.currentTarget as HTMLInputElement).value)} placeholder="owner/repo 或 GitHub URL"></md-outlined-text-field>
        </div>

        <div class="field">
          <label>显示名称</label>
          <md-outlined-text-field disabled={props.disabled} value={name()} onInput={(e: InputEvent) => setName((e.currentTarget as HTMLInputElement).value)} placeholder="留空自动使用仓库名"></md-outlined-text-field>
        </div>
      </div>

      <div class="form-section">
        <div class="field-row">
          <div class="field">
            <label>下载策略</label>
            <md-outlined-select disabled={props.disabled} value={strategyType()} onInput={(e: Event) => setStrategyType((e.currentTarget as { value?: string }).value ?? 'zipball')}>
              <md-select-option value="zipball" selected={strategyType() === 'zipball'}>Release 压缩包</md-select-option>
              <md-select-option value="asset" selected={strategyType() === 'asset'}>Release 附件（压缩包）</md-select-option>
              <md-select-option value="asset-files" selected={strategyType() === 'asset-files'}>Release 附件（独立文件）</md-select-option>
              <md-select-option value="archive" selected={strategyType() === 'archive'}>仓库源码</md-select-option>
            </md-outlined-select>
          </div>

          <div class="field">
            <label>分类</label>
            <md-outlined-select disabled={props.disabled} value={category()} onInput={(e: Event) => setCategory((e.currentTarget as { value?: string }).value ?? 'schema')}>
              <md-select-option value="schema" selected={category() === 'schema'}>方案</md-select-option>
              <md-select-option value="dict" selected={category() === 'dict'}>词库</md-select-option>
              <md-select-option value="model" selected={category() === 'model'}>模型</md-select-option>
            </md-outlined-select>
          </div>
        </div>

        <div class="field">
          <label>合并顺序</label>
          <md-outlined-text-field
            disabled={props.disabled}
            type="number"
            value={order()}
            onInput={(e: InputEvent) => setOrder((e.currentTarget as HTMLInputElement).value)}
            placeholder="数值越小越先合并"
          ></md-outlined-text-field>
        </div>
      </div>

      <div class="form-section">
        {needsPattern() ? (
          <div class="field">
            <label>匹配规则</label>
            <md-outlined-text-field disabled={props.disabled} value={strategyPattern()} onInput={(e: InputEvent) => setStrategyPattern((e.currentTarget as HTMLInputElement).value)} placeholder="如: full\\.zip"></md-outlined-text-field>
          </div>
        ) : null}

        <div class="field">
          <label>指定 Tag/分支</label>
          <md-outlined-text-field disabled={props.disabled} value={strategyTag()} onInput={(e: InputEvent) => setStrategyTag((e.currentTarget as HTMLInputElement).value)} placeholder="留空则 latest/HEAD"></md-outlined-text-field>
        </div>

        <div class="form-hint">
          <div class="label">提示</div>
          <div class="item-meta">`order` 越小越早合并；后合并的资源会覆盖同名文件。</div>
        </div>
      </div>

      {error() ? <div class="error-text">{error()}</div> : null}

      <div class="action-row form-actions">
        <md-outlined-button class="action-btn" disabled={props.disabled} onClick={props.onCancel}>取消</md-outlined-button>
        <md-filled-button class="action-btn" disabled={props.disabled} onClick={submit}>{isEdit() ? '保存' : '添加'}</md-filled-button>
      </div>
    </md-outlined-card>
  )
}
