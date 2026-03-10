// resources.ts — Resource definitions and download orchestration
import type { ResourceDef, ResourceId, UpdateCheckResult } from '@/types'
import { fetchRelease, findAllAssetUrls, getArchiveUrl, fetchLatestCommitSha } from './github'
import { configGet, getVersion, setVersion, downloadFile, unzipFile, ensureDirs, listResources } from './commands'
import { PERSIST_DIR } from './shell'

const RESOURCE_DIR = `${PERSIST_DIR}/resources`
const DOWNLOAD_DIR = `${PERSIST_DIR}/downloads`

export let RESOURCES: ResourceDef[] = []

export async function loadResources(): Promise<ResourceDef[]> {
  RESOURCES = await listResources()
  return RESOURCES
}

export function getResourceDef(rid: ResourceId): ResourceDef | undefined {
  return RESOURCES.find(r => r.id === rid)
}

export async function getEnabledResourceIds(): Promise<ResourceId[]> {
  const results: ResourceId[] = []
  for (const def of RESOURCES) {
    const defaultVal = def.id === 'rime-ice' ? 'true' : 'false'
    const enabled = await configGet(`resource_${def.id}_enabled`, defaultVal)
    if (enabled === 'true') results.push(def.id)
  }
  return results
}

// ── Strategy parsing ────────────────────────────────────────

interface ParsedStrategy {
  type: 'zipball' | 'asset' | 'asset-files' | 'archive'
  pattern?: string
  tag?: string
}

function parseStrategy(raw: string): ParsedStrategy {
  if (!raw || raw === 'zipball') return { type: 'zipball' }

  const colonIdx = raw.indexOf(':')
  let type: string
  let rest: string

  if (colonIdx >= 0) {
    type = raw.substring(0, colonIdx)
    rest = raw.substring(colonIdx + 1)
  } else {
    type = raw
    rest = ''
  }

  let pattern: string | undefined
  let tag: string | undefined

  if (rest) {
    const atIdx = rest.lastIndexOf('@')
    if (atIdx >= 0) {
      pattern = rest.substring(0, atIdx)
      tag = rest.substring(atIdx + 1)
    } else {
      pattern = rest
    }
  } else {
    const atIdx = type.lastIndexOf('@')
    if (atIdx >= 0) {
      tag = type.substring(atIdx + 1)
      type = type.substring(0, atIdx)
    }
  }

  const validTypes = ['zipball', 'asset', 'asset-files', 'archive']
  if (!validTypes.includes(type)) {
    throw new Error(`Unsupported strategy type: ${type}`)
  }

  if ((type === 'asset' || type === 'asset-files') && !pattern) {
    throw new Error(`Strategy ${type} requires a pattern`)
  }

  return {
    type: type as ParsedStrategy['type'],
    pattern: pattern || undefined,
    tag: tag || undefined,
  }
}

// ── Update checking ─────────────────────────────────────────

export async function checkResourceUpdate(rid: ResourceId): Promise<UpdateCheckResult> {
  const def = getResourceDef(rid)
  if (!def) return { id: rid, current: '', latest: '', has_update: false, error: 'Unknown resource' }

  try {
    const current = await getVersion(rid)
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
