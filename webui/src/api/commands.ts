// commands.ts — Thin wrappers calling helper.sh subcommands
import { execHelper, execHelperVoid, shellQuote } from './shell'
import type {
  AppStateSnapshot,
  DownloadTaskStatus,
  Resource,
  ResourceId,
  RimeApp,
  ResourceDef,
  ResourceProgressState,
} from '@/types'

function splitCsv(value: string): ResourceId[] {
  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function normalizeTaskState(value: string): DownloadTaskStatus['state'] {
  return value === 'running' || value === 'success' || value === 'error' ? value : 'idle'
}

function normalizeTaskMode(value: string): DownloadTaskStatus['mode'] {
  return value === 'bulk' ? 'bulk' : 'single'
}

function normalizeProgressState(value: string): ResourceProgressState {
  return value === 'checking' || value === 'downloading' || value === 'extracting' || value === 'done' || value === 'error'
    ? value
    : 'idle'
}

function parseKeyValueOutput(stdout: string): Record<string, string> {
  return stdout.trim().split('\n').reduce<Record<string, string>>((acc, line) => {
    const index = line.indexOf('=')
    if (index <= 0) return acc
    acc[line.slice(0, index)] = line.slice(index + 1)
    return acc
  }, {})
}

function getString(data: Record<string, string>, key: string): string {
  return data[key]?.trim() ?? ''
}

function getNumber(data: Record<string, string>, key: string): number {
  const value = Number.parseInt(getString(data, key), 10)
  return Number.isFinite(value) ? value : 0
}

function getBoolean(data: Record<string, string>, key: string): boolean {
  return getString(data, key) === 'true'
}

function parseResourcesFromSnapshot(data: Record<string, string>): Resource[] {
  const resourceIds = Array.from(new Set(
    Object.keys(data)
      .filter(key => key.startsWith('resource.') && key.endsWith('.id'))
      .map(key => key.split('.')[1])
      .filter(Boolean),
  ))

  return resourceIds.map(id => ({
    id,
    name: getString(data, `resource.${id}.name`),
    repo: getString(data, `resource.${id}.repo`),
    strategy: getString(data, `resource.${id}.strategy`) || 'zipball',
    order: getNumber(data, `resource.${id}.order`),
    category: getString(data, `resource.${id}.category`) || undefined,
    enabled: getBoolean(data, `resource.${id}.enabled`),
    version: getString(data, `resource.${id}.version`),
    installed: getBoolean(data, `resource.${id}.installed`),
  })).sort((a, b) => a.order - b.order)
}

export function parseDownloadTaskStatus(data: Record<string, string>, prefix = ''): DownloadTaskStatus {
  const key = (name: string) => `${prefix}${name}`
  return {
    state: normalizeTaskState(data[key('state')] ?? ''),
    mode: normalizeTaskMode(data[key('mode')] ?? ''),
    currentId: data[key('current_id')]?.trim() ? data[key('current_id')].trim() : null,
    currentState: normalizeProgressState(data[key('current_state')] ?? ''),
    currentDetail: data[key('current_detail')]?.trim() ?? '',
    completedIds: splitCsv(data[key('completed_ids')] ?? ''),
    failedIds: splitCsv(data[key('failed_ids')] ?? ''),
    error: data[key('error')]?.trim() ?? '',
    updatedAt: data[key('updated_at')]?.trim() ?? '',
  }
}

export async function detectApps(): Promise<RimeApp[]> {
  const stdout = await execHelper('detect')
  if (!stdout.trim()) return []
  return stdout.trim().split('\n').map(line => {
    const [pkg, label, rime_path, uid, dir_exists] = line.split('|')
    return { package: pkg, label, rime_path, uid, rime_dir_exists: dir_exists === 'true' }
  })
}

export async function configGet(key: string, defaultVal = ''): Promise<string> {
  const val = await execHelper('config', `get ${shellQuote(key)} ${shellQuote(defaultVal)}`)
  return val.trim()
}

export async function configSet(key: string, value: string): Promise<void> {
  await execHelperVoid('config', `set ${shellQuote(key)} ${shellQuote(value)}`)
}

export async function getVersion(rid: ResourceId): Promise<string> {
  const val = await execHelper('version', `get ${shellQuote(rid)}`)
  return val.trim()
}

export async function setVersion(rid: ResourceId, ver: string): Promise<void> {
  await execHelperVoid('version', `set ${shellQuote(rid)} ${shellQuote(ver)}`)
}

export async function downloadFile(url: string, dest: string): Promise<void> {
  await execHelperVoid('download', `${shellQuote(url)} ${shellQuote(dest)}`)
}

export async function unzipFile(file: string, dest: string): Promise<void> {
  await execHelperVoid('unzip', `${shellQuote(file)} ${shellQuote(dest)}`)
}

export async function startDownloadTask(resourceId: ResourceId): Promise<void> {
  await execHelperVoid('download-task', `start ${shellQuote(resourceId)}`)
}

export async function startDownloadEnabledTask(): Promise<void> {
  await execHelperVoid('download-task', 'start-enabled')
}

export async function getDownloadTaskStatus(): Promise<DownloadTaskStatus> {
  const stdout = await execHelper('download-task', 'status')
  const data = parseKeyValueOutput(stdout)
  return parseDownloadTaskStatus(data)
}

export async function getAppStateSnapshot(): Promise<AppStateSnapshot> {
  const stdout = await execHelper('status')
  const data = parseKeyValueOutput(stdout)

  return {
    targetApps: getString(data, 'config.target_apps'),
    targetCount: getNumber(data, 'config.target_count'),
    resources: parseResourcesFromSnapshot(data),
    download: parseDownloadTaskStatus(data, 'download.'),
    deploy: {
      state: normalizeTaskState(data['deploy.state'] ?? ''),
      detail: getString(data, 'deploy.detail'),
      error: getString(data, 'deploy.error'),
      updatedAt: getString(data, 'deploy.updated_at'),
      lastSuccessAt: getString(data, 'deploy.last_success_at'),
    },
    summary: {
      enabledResourceCount: getNumber(data, 'summary.enabled_resource_count'),
      installedResourceCount: getNumber(data, 'summary.installed_resource_count'),
    },
  }
}

export async function deployAll(): Promise<void> {
  await execHelperVoid('deploy-all')
}

export async function ensureDirs(): Promise<void> {
  await execHelperVoid('ensure-dirs')
}

export async function readLog(): Promise<string> {
  return execHelper('log')
}

export async function listResources(): Promise<ResourceDef[]> {
  const stdout = await execHelper('list-resources')
  if (!stdout.trim()) return []
  return stdout.trim().split('\n').map(line => {
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

export async function removeResource(id: ResourceId): Promise<void> {
  await execHelperVoid('remove-resource', shellQuote(id))
}

export async function resetResources(): Promise<void> {
  await execHelperVoid('reset-resources')
}

export async function clearDownloadCache(): Promise<void> {
  await execHelperVoid('clear-download-cache')
}
