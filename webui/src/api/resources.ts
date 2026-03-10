// resources.ts — Resource definitions and download orchestration
import type { ResourceDef, ResourceId, UpdateCheckResult } from '@/types'
import { fetchRelease, findAllAssetUrls, getArchiveUrl, fetchLatestCommitSha } from './github'
import { configGet, getVersion, setVersion, downloadFile, unzipFile, ensureDirs, listResources } from './commands'
import { PERSIST_DIR } from './shell'
import { parseStrategy } from '@/resourceStrategy'

const RESOURCE_DIR = `${PERSIST_DIR}/resources`
const DOWNLOAD_DIR = `${PERSIST_DIR}/downloads`

export let RESOURCES: ResourceDef[] = []

async function isResourceEnabled(def: ResourceDef): Promise<boolean> {
  const enabled = await configGet(`resource_${def.id}_enabled`, 'false')
  return enabled === 'true'
}

export async function loadResources(): Promise<ResourceDef[]> {
  RESOURCES = await listResources()
  return RESOURCES
}

export function getResourceDef(rid: ResourceId): ResourceDef | undefined {
  return RESOURCES.find(r => r.id === rid)
}

export async function getEnabledResourceIds(): Promise<ResourceId[]> {
  const enabled = await Promise.all(RESOURCES.map(async def => ({ id: def.id, enabled: await isResourceEnabled(def) })))
  return enabled.filter(item => item.enabled).map(item => item.id)
}

// ── Update checking ─────────────────────────────────────────

export async function checkResourceUpdate(rid: ResourceId): Promise<UpdateCheckResult> {
  const def = getResourceDef(rid)
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
      current: await getVersion(rid).catch(() => ''),
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

// ── Download orchestration ──────────────────────────────────

export type ProgressCallback = (rid: ResourceId, state: string, detail: string) => void

export async function downloadResource(rid: ResourceId, onProgress?: ProgressCallback): Promise<void> {
  const def = getResourceDef(rid)
  if (!def) throw new Error(`Unknown resource: ${rid}`)

  await ensureDirs()
  onProgress?.(rid, 'checking', '')

  const s = parseStrategy(def.strategy)
  const extractDir = `${RESOURCE_DIR}/${rid}`

  if (s.type === 'archive') {
    // ── Archive mode: download repo branch zipball ──
    const ref = s.tag ?? 'HEAD'
    const sha = await fetchLatestCommitSha(def.repo, ref)

    const current = await getVersion(rid)
    if (current === sha) {
      onProgress?.(rid, 'done', `Already up to date (${sha})`)
      return
    }

    onProgress?.(rid, 'downloading', ref)
    const dlFile = `${DOWNLOAD_DIR}/${rid}.zip`
    await downloadFile(getArchiveUrl(def.repo, ref), dlFile)
    onProgress?.(rid, 'extracting', ref)
    await unzipFile(dlFile, extractDir)

    await setVersion(rid, sha)
    onProgress?.(rid, 'done', sha)
  } else {
    // ── Release mode (zipball / asset / asset-files) ──
    const release = await fetchRelease(def.repo, s.tag)
    const tag = release.tag_name

    const current = await getVersion(rid)
    if (current === tag) {
      onProgress?.(rid, 'done', `Already up to date (${tag})`)
      return
    }

    onProgress?.(rid, 'downloading', tag)

    if (s.type === 'asset' && s.pattern) {
      // Download first matching zip asset → unzip
      const urls = findAllAssetUrls(release, s.pattern)
      if (urls.length === 0) throw new Error(`No matching asset for ${s.pattern}`)
      const dlFile = `${DOWNLOAD_DIR}/${rid}.zip`
      await downloadFile(urls[0], dlFile)
      onProgress?.(rid, 'extracting', tag)
      await unzipFile(dlFile, extractDir)
    } else if (s.type === 'asset-files' && s.pattern) {
      // Download all matching asset files directly
      const urls = findAllAssetUrls(release, s.pattern)
      if (urls.length === 0) throw new Error(`No matching asset for ${s.pattern}`)
      for (const url of urls) {
        const filename = url.split('/').pop() ?? `${rid}.dat`
        await downloadFile(url, `${extractDir}/${filename}`)
      }
    } else {
      // zipball (default)
      const dlFile = `${DOWNLOAD_DIR}/${rid}.zip`
      await downloadFile(release.zipball_url, dlFile)
      onProgress?.(rid, 'extracting', tag)
      await unzipFile(dlFile, extractDir)
    }

    await setVersion(rid, tag)
    onProgress?.(rid, 'done', tag)
  }
}

export async function downloadAllEnabled(onProgress?: ProgressCallback): Promise<void> {
  const enabledIds = await getEnabledResourceIds()
  for (const rid of enabledIds) {
    try {
      await downloadResource(rid, onProgress)
    } catch (e) {
      onProgress?.(rid, 'error', e instanceof Error ? e.message : String(e))
    }
  }
}
