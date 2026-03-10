// commands.ts — Thin wrappers calling helper.sh subcommands
import { execHelper, execHelperVoid, shellQuote } from './shell'
import type { RimeApp, ResourceId, ResourceDef } from '@/types'

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
