<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { addResource } from '@/api/commands'
import { buildStrategy, parseStrategy } from '@/resourceStrategy'
import type { ResourceDef } from '@/types'

const props = withDefaults(defineProps<{
  existingIds?: string[]
  mode?: 'add' | 'edit'
  initialResource?: ResourceDef | null
}>(), {
  existingIds: () => [],
  mode: 'add',
  initialResource: null,
})

const emit = defineEmits<{
  cancel: []
  added: [name: string]
}>()

const repoInput = ref('')
const nameInput = ref('')
const strategyTypeInput = ref('zipball')
const strategyPatternInput = ref('')
const strategyTagInput = ref('')
const categoryInput = ref('schema')
const error = ref('')
const adding = ref(false)

const isEdit = computed(() => props.mode === 'edit')
const needsPattern = computed(() => ['asset', 'asset-files'].includes(strategyTypeInput.value))

function parseRepo(input: string): string {
  const match = input.match(/(?:github\.com\/)?([^\/\s]+\/[^\/\s]+?)(?:\.git)?$/)
  return match ? match[1] : input.trim()
}

function resetForm() {
  repoInput.value = ''
  nameInput.value = ''
  strategyTypeInput.value = 'zipball'
  strategyPatternInput.value = ''
  strategyTagInput.value = ''
  categoryInput.value = 'schema'
  error.value = ''
}

function applyInitialResource() {
  const resource = props.initialResource
  if (!isEdit.value || !resource) {
    resetForm()
    return
  }
  const parsed = parseStrategy(resource.strategy)
  repoInput.value = resource.repo
  nameInput.value = resource.name
  strategyTypeInput.value = parsed.type
  strategyPatternInput.value = parsed.pattern ?? ''
  strategyTagInput.value = parsed.tag ?? ''
  categoryInput.value = resource.category ?? 'schema'
  error.value = ''
}

watch(() => [props.mode, props.initialResource], applyInitialResource, { immediate: true })

async function submit() {
  error.value = ''
  const repo = parseRepo(repoInput.value)
  if (!repo || !repo.includes('/')) {
    error.value = '请输入有效的仓库地址 (owner/repo)'
    return
  }

  const repoName = repo.split('/')[1]
  const fallbackId = repoName.toLowerCase()
  const id = (isEdit.value && props.initialResource?.id) ? props.initialResource.id : fallbackId
  const name = nameInput.value.trim() || repoName

  const duplicateId = props.existingIds.includes(id) && id !== props.initialResource?.id
  if (duplicateId) {
    error.value = `资源 "${id}" 已存在`
    return
  }

  if (needsPattern.value && !strategyPatternInput.value.trim()) {
    error.value = '该策略需要填写匹配规则'
    return
  }

  adding.value = true
  try {
    const payload: ResourceDef = {
      id,
      name,
      repo,
      strategy: buildStrategy(strategyTypeInput.value, strategyPatternInput.value, strategyTagInput.value),
      order: props.initialResource?.order ?? 50,
      category: categoryInput.value,
    }
    await addResource(payload)
    if (!isEdit.value) resetForm()
    emit('added', name)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    adding.value = false
  }
}
</script>

<template>
  <div class="card add-form">
    <div class="card-title">{{ isEdit ? '编辑资源' : '添加自定义资源' }}</div>
    <div class="form-group">
      <label class="form-label">GitHub 仓库</label>
      <input
        v-model="repoInput"
        class="form-input"
        placeholder="owner/repo 或 GitHub URL"
      />
    </div>

    <div class="form-group">
      <label class="form-label">显示名称（可选）</label>
      <input
        v-model="nameInput"
        class="form-input"
        placeholder="留空则使用仓库名"
      />
    </div>

    <div class="form-row">
      <div class="form-group form-half">
        <label class="form-label">下载策略</label>
        <select v-model="strategyTypeInput" class="form-input">
          <option value="zipball">Release 压缩包</option>
          <option value="asset">Release 附件（压缩包）</option>
          <option value="asset-files">Release 附件（独立文件）</option>
          <option value="archive">仓库源码</option>
        </select>
      </div>
      <div class="form-group form-half">
        <label class="form-label">分类</label>
        <select v-model="categoryInput" class="form-input">
          <option value="schema">方案</option>
          <option value="dict">词库</option>
          <option value="model">模型</option>
        </select>
      </div>
    </div>

    <div v-if="needsPattern" class="form-group">
      <label class="form-label">匹配规则（正则表达式）</label>
      <input
        v-model="strategyPatternInput"
        class="form-input"
        placeholder="例: full\.zip 或 \.dict\.yaml$"
      />
    </div>

    <div class="form-group">
      <label class="form-label">指定 Tag / 分支（可选）</label>
      <input
        v-model="strategyTagInput"
        class="form-input"
        placeholder="留空则取 latest release 或 HEAD"
      />
    </div>

    <div v-if="error" class="form-error">{{ error }}</div>

    <div class="form-actions">
      <button class="btn btn-outline" :disabled="adding" @click="emit('cancel')">取消</button>
      <button class="btn btn-primary" :disabled="adding" @click="submit">
        {{ adding ? (isEdit ? '保存中...' : '添加中...') : (isEdit ? '保存' : '添加') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.add-form {
  margin-top: 4px;
}

.form-group {
  margin-bottom: 12px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.form-half {
  flex: 1;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--outline-variant);
  border-radius: var(--radius-small);
  font-size: 14px;
  background: var(--surface);
  color: var(--text);
  outline: none;
}

.form-input:focus,
.form-input:focus-visible {
  border-color: var(--primary);
  outline: 2px solid color-mix(in srgb, var(--primary) 40%, transparent);
  outline-offset: 1px;
}

.form-error {
  font-size: 13px;
  color: var(--error);
  background: var(--error-soft);
  border: 1px solid var(--error);
  border-radius: var(--radius-small);
  padding: 8px 10px;
  margin-bottom: 8px;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
