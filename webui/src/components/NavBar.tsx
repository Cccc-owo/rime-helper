import type { JSX } from 'solid-js'
import type { RouteName } from '@/lib/types'

interface Props {
  activeTab: RouteName
  onTabChange: (route: RouteName) => void
  tabs?: Array<{ id: RouteName; label: string }>
}

function TabIcon(props: { tab: RouteName }): JSX.Element {
  if (props.tab === 'deploy') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v11"></path>
        <path d="m7.5 9.5 4.5 4.5 4.5-4.5"></path>
        <path d="M5 19h14"></path>
      </svg>
    )
  }

  if (props.tab === 'resources') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6.5 7.5h11"></path>
        <path d="M6.5 12h11"></path>
        <path d="M6.5 16.5h7"></path>
        <circle cx="5" cy="7.5" r="1"></circle>
        <circle cx="5" cy="12" r="1"></circle>
        <circle cx="5" cy="16.5" r="1"></circle>
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"></path>
      <path d="M5.5 12a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"></path>
      <path d="M18.5 12a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"></path>
      <path d="M12 8.5V11"></path>
      <path d="M7.5 13.5h9"></path>
    </svg>
  )
}

export default function NavBar(props: Props) {
  const items: Array<{ key: RouteName; label: string }> = (props.tabs ?? [
    { id: 'deploy', label: '同步' },
    { id: 'resources', label: '资源' },
    { id: 'settings', label: '设置' },
  ]).map((tab) => ({
    key: tab.id,
    label: tab.label,
  }))

  const fallbackItems: Array<{ key: RouteName; label: string }> = [
    { key: 'deploy', label: '同步' },
    { key: 'resources', label: '资源' },
    { key: 'settings', label: '设置' },
  ]

  const resolvedItems = items.length > 0 ? items : fallbackItems

  return (
    <nav class="nav-wrap" aria-label="主导航">
      <div class="nav-shell" role="tablist" aria-orientation="horizontal">
        {resolvedItems.map((item) => {
          const active = item.key === props.activeTab
          return (
            <button
              type="button"
              id={`tab-${item.key}`}
              class={`nav-item ${active ? 'active' : ''}`}
              role="tab"
              aria-selected={active}
              aria-current={active ? 'page' : undefined}
              aria-controls={`panel-${item.key}`}
              onClick={() => {
                if (!active) props.onTabChange(item.key)
              }}
            >
              <span class={`nav-indicator ${active ? 'active' : ''}`} aria-hidden="true">
                <span class="nav-icon">
                  <TabIcon tab={item.key} />
                </span>
              </span>
              <span class="nav-label">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
