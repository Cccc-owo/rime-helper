interface GitHubRelease {
  tag_name: string
}

const API = 'https://api.github.com'

export async function fetchReleaseTag(repo: string, tag?: string): Promise<string> {
  const endpoint = tag
    ? `${API}/repos/${repo}/releases/tags/${tag}`
    : `${API}/repos/${repo}/releases/latest`
  const res = await fetch(endpoint)
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`)
  const data = await res.json() as GitHubRelease
  return data.tag_name
}

export async function fetchCommitSha(repo: string, ref = 'HEAD'): Promise<string> {
  const res = await fetch(`${API}/repos/${repo}/commits/${ref}`)
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`)
  const data = await res.json() as { sha: string }
  return data.sha.substring(0, 12)
}
