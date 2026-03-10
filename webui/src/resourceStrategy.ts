export type ResourceStrategyType = 'zipball' | 'asset' | 'asset-files' | 'archive'

export interface ParsedStrategy {
  type: ResourceStrategyType
  pattern?: string
  tag?: string
}

const VALID_TYPES: readonly ResourceStrategyType[] = ['zipball', 'asset', 'asset-files', 'archive']

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

  if (!VALID_TYPES.includes(type as ResourceStrategyType)) {
    throw new Error(`Unsupported strategy type: ${type}`)
  }

  if ((type === 'asset' || type === 'asset-files') && !pattern) {
    throw new Error(`Strategy ${type} requires a pattern`)
  }

  return {
    type: type as ResourceStrategyType,
    pattern: pattern || undefined,
    tag: tag || undefined,
  }
}

export function buildStrategy(type: string, pattern: string, tag: string): string {
  let strategy = type || 'zipball'
  const trimmedPattern = pattern.trim()
  const trimmedTag = tag.trim()

  if (trimmedPattern) strategy += `:${trimmedPattern}`
  if (trimmedTag) strategy += `@${trimmedTag}`

  return strategy
}
