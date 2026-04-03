export interface ParsedStrategy {
  type: 'zipball' | 'asset' | 'asset-files' | 'archive'
  pattern?: string
  tag?: string
}

export function parseStrategy(raw: string): ParsedStrategy {
  if (!raw || raw === 'zipball') return { type: 'zipball' }

  const colonIdx = raw.indexOf(':')
  let type = colonIdx >= 0 ? raw.substring(0, colonIdx) : raw
  const rest = colonIdx >= 0 ? raw.substring(colonIdx + 1) : ''

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

  if (type !== 'zipball' && type !== 'asset' && type !== 'asset-files' && type !== 'archive') {
    throw new Error(`Unsupported strategy: ${type}`)
  }

  return { type, pattern, tag } as ParsedStrategy
}

export function buildStrategy(type: string, pattern: string, tag: string): string {
  const normalized = type || 'zipball'
  const p = pattern.trim()
  const t = tag.trim()

  let result = normalized
  if (p) result += `:${p}`
  if (t) result += `@${t}`
  return result
}
