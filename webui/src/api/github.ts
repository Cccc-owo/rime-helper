// github.ts — GitHub API client using native fetch()
import type { GitHubRelease } from '@/types'

const GITHUB_API = 'https://api.github.com'

export async function fetchLatestRelease(repo: string): Promise<GitHubRelease> {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/releases/latest`)
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<GitHubRelease>
}

export async function fetchReleaseByTag(repo: string, tag: string): Promise<GitHubRelease> {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/releases/tags/${tag}`)
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<GitHubRelease>
}

/** Get the release for a resource: by tag if specified, otherwise latest */
export async function fetchRelease(repo: string, tag?: string): Promise<GitHubRelease> {
  return tag ? fetchReleaseByTag(repo, tag) : fetchLatestRelease(repo)
}

/** Get repo archive (zipball) URL for a branch/ref */
export function getArchiveUrl(repo: string, ref: string): string {
  return `${GITHUB_API}/repos/${repo}/zipball/${ref}`
}

/** Get latest commit SHA for a branch/ref */
export async function fetchLatestCommitSha(repo: string, ref: string): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/commits/${ref}`)
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`)
  }
  const data = await res.json() as { sha: string }
  return data.sha.substring(0, 12)
}

/** Find asset download URL matching a regex pattern */
export function findAssetUrl(release: GitHubRelease, pattern: string): string | undefined {
  const re = new RegExp(pattern)
  return release.assets.find(a => re.test(a.name))?.browser_download_url
}

/** Find ALL asset download URLs matching a regex pattern */
export function findAllAssetUrls(release: GitHubRelease, pattern: string): string[] {
  const re = new RegExp(pattern)
  return release.assets.filter(a => re.test(a.name)).map(a => a.browser_download_url)
}
