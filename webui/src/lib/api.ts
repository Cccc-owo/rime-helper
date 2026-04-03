import { execHelper, execHelperVoid, shellQuote } from './shell'
import type { AppSnapshot, DownloadTaskStatus, Resource, ResourceDef, ResourceId, RimeApp } from './types'

function parseKV(stdout: string): Record<string, string> {
  return stdout.trim().split('\n').reduce<Record<string, string>>((acc, line) => {
    const i = line.indexOf('=')
    if (i <= 0) return acc
    acc[line.slice(0, i)] = line.slice(i + 1)
    return acc
  }, {})
}

function getString(data: Record<string, string>, key: string): string {
  return data[key]?.trim() ?? ''
}

function getNumber(data: Record<string, string>, key: string): number {
  const parsed = Number.parseInt(getString(data, key), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function getBool(data: Record<string, string>, key: string): boolean {
  return getString(data, key) === 'true'
}

function normalizeState(value: string): DownloadTaskStatus['state'] {
  return value === 'running' || value === 'success' || value === 'error' ? value : 'idle'
}

function normalizeMode(value: string): DownloadTaskStatus['mode'] {
  return value === 'bulk' ? 'bulk' : 'single'
}

function normalizeProgress(value: string): DownloadTaskStatus['currentState'] {
  return value === 'checking' || value === 'downloading' || value === 'extracting' || value === 'done' || value === 'error'
    ? value
    : 'idle'
}

function splitCsv(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function parseDownload(data: Record<string, string>, prefix = ''): DownloadTaskStatus {
  const key = (name: string) => `${prefix}${name}`
  return {
    state: normalizeState(data[key('state')] ?? ''),
    mode: normalizeMode(data[key('mode')] ?? ''),
    currentId: getString(data, key('current_id')) || null,
    currentState: normalizeProgress(data[key('current_state')] ?? ''),
    currentDetail: getString(data, key('current_detail')),
    completedIds: splitCsv(getString(data, key('completed_ids'))),
    failedIds: splitCsv(getString(data, key('failed_ids'))),
    error: getString(data, key('error')),
    updatedAt: getString(data, key('updated_at')),
  }
}

function parseResources(data: Record<string, string>): Resource[] {
  const ids = Array.from(new Set(
    Object.keys(data)
      .filter(key => key.startsWith('resource.') && key.endsWith('.id'))
      .map(key => key.split('.')[1]),
  ))

  return ids.map((id) => ({
    id,
    name: getString(data, `resource.${id}.name`),
    repo: getString(data, `resource.${id}.repo`),
    strategy: getString(data, `resource.${id}.strategy`) || 'zipball',
    order: getNumber(data, `resource.${id}.order`),
    category: getString(data, `resource.${id}.category`) || undefined,
    enabled: getBool(data, `resource.${id}.enabled`),
    version: getString(data, `resource.${id}.version`),
    installed: getBool(data, `resource.${id}.installed`),
  })).sort((a, b) => a.order - b.order)
}

export async function detectApps(): Promise<RimeApp[]> {
  const stdout = await execHelper('detect')
  if (!stdout.trim()) return []
  return stdout.trim().split('\n').map((line) => {
    const [pkg, label, rimePath, uid, exists] = line.split('|')
    return {
      package: pkg,
      label,
      rime_path: rimePath,
      uid,
      rime_dir_exists: exists === 'true',
    }
  })
}

export async function getSnapshot(): Promise<AppSnapshot> {
  const stdout = await execHelper('status')
  const data = parseKV(stdout)
  return {
    targetApps: getString(data, 'config.target_apps'),
    targetCount: getNumber(data, 'config.target_count'),
    resources: parseResources(data),
    download: parseDownload(data, 'download.'),
    deploy: {
      state: normalizeState(data['deploy.state'] ?? ''),
      detail: getString(data, 'deploy.detail'),
      error: getString(data, 'deploy.error'),
      updatedAt: getString(data, 'deploy.updated_at'),
      lastSuccessAt: getString(data, 'deploy.last_success_at') || '0',
    },
    summary: {
      enabledResourceCount: getNumber(data, 'summary.enabled_resource_count'),
      installedResourceCount: getNumber(data, 'summary.installed_resource_count'),
    },
  }
}

export async function setConfig(key: string, value: string): Promise<void> {
  await execHelperVoid('config', `set ${shellQuote(key)} ${shellQuote(value)}`)
}

export async function getVersion(rid: ResourceId): Promise<string> {
  const val = await execHelper('version', `get ${shellQuote(rid)}`)
  return val.trim()
}

export async function startDownload(resourceId: ResourceId): Promise<void> {
  await execHelperVoid('download-task', `start ${shellQuote(resourceId)}`)
}

export async function startDownloadEnabled(): Promise<void> {
  await execHelperVoid('download-task', 'start-enabled')
}

export async function deployAll(): Promise<void> {
  await execHelperVoid('deploy-all')
}

export async function readLog(): Promise<string> {
  return execHelper('log')
}

export async function clearDownloadCache(): Promise<void> {
  await execHelperVoid('clear-download-cache')
}

export async function listResources(): Promise<ResourceDef[]> {
  const stdout = await execHelper('list-resources')
  if (!stdout.trim()) return []
  return stdout.trim().split('\n').map((line) => {
    const [id, name, repo, strategy, order, category] = line.split('|')
    return {
      id,
      name,
      repo,
      strategy: strategy || 'zipball',
      order: Number(order) || 0,
      category: category || undefined,
    }
  })
}

export async function addResource(def: ResourceDef): Promise<void> {
  await execHelperVoid(
    'add-resource',
    `${shellQuote(def.id)} ${shellQuote(def.name)} ${shellQuote(def.repo)} ${shellQuote(def.strategy)} ${shellQuote(String(def.order))} ${shellQuote(def.category ?? '')}`,
  )
}

export async function removeResource(resourceId: ResourceId): Promise<void> {
  await execHelperVoid('remove-resource', shellQuote(resourceId))
}

export async function resetResources(): Promise<void> {
  await execHelperVoid('reset-resources')
}
