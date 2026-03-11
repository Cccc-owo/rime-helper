// resources.ts — Resource definitions and update checking
import type { ResourceDef, ResourceId, UpdateCheckResult } from '@/types'
import { fetchRelease, fetchLatestCommitSha } from './github'
import { configGet, getVersion, listResources } from './commands'
import { parseStrategy } from '@/resourceStrategy'

export let RESOURCES: ResourceDef[] = []

async function ensureResourcesLoaded(): Promise<ResourceDef[]> {
  if (RESOURCES.length > 0) return RESOURCES
  RESOURCES = await listResources()
  return RESOURCES
}

async function isResourceEnabled(def: ResourceDef): Promise<boolean> {
  const enabled = await configGet(`resource_${def.id}_enabled`, 'false')
  return enabled === 'true'
}

export async function loadResources(): Promise<ResourceDef[]> {
  RESOURCES = await listResources()
  return RESOURCES
}

export async function getResourceDef(rid: ResourceId): Promise<ResourceDef | undefined> {
  const resources = await ensureResourcesLoaded()
  return resources.find(r => r.id === rid)
}

export async function getEnabledResourceIds(): Promise<ResourceId[]> {
  const resources = await ensureResourcesLoaded()
  const enabled = await Promise.all(resources.map(async def => ({ id: def.id, enabled: await isResourceEnabled(def) })))
  return enabled.filter(item => item.enabled).map(item => item.id)
}

// ── Update checking ─────────────────────────────────────────

export async function checkResourceUpdate(rid: ResourceId): Promise<UpdateCheckResult> {
  const def = await getResourceDef(rid)
  if (!def) return { id: rid, current: '', latest: '', has_update: false, error: 'Unknown resource' }

  const current = await getVersion(rid).catch(() => '')

  try {
    const s = parseStrategy(def.strategy)
    let latest: string

    if (s.type === 'archive') {
      latest = await fetchLatestCommitSha(def.repo, s.tag ?? 'HEAD')
    } else {
      const release = await fetchRelease(def.repo, s.tag)
      latest = release.tag_name
    }

    return {
      id: rid,
      current,
      latest,
      has_update: !!latest && latest !== current,
    }
  } catch (e) {
    return {
      id: rid,
      current,
      latest: '',
      has_update: false,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

export async function checkAllUpdates(): Promise<UpdateCheckResult[]> {
  const enabledIds = await getEnabledResourceIds()
  return Promise.all(enabledIds.map(rid => checkResourceUpdate(rid)))
}
