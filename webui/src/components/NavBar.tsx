import { onCleanup, onMount } from 'solid-js'
import type { RouteName } from '@/lib/types'

interface Props {
  activeTab: RouteName
  onTabChange: (route: RouteName) => void
  tabs?: Array<{ id: RouteName; label: string }>
}

export default function NavBar(props: Props) {
  let navEl: HTMLElement | undefined

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

  const activeIndex = () => {
    const index = resolvedItems.findIndex((item) => item.key === props.activeTab)
    return index < 0 ? 0 : index
  }

  const onActivated = (event: Event) => {
    const custom = event as CustomEvent<{ activeIndex?: number }>
    const host = event.currentTarget as { activeIndex?: number }
    const index = custom.detail?.activeIndex ?? host.activeIndex ?? 0
    const next = resolvedItems[index]
    if (!next || next.key === props.activeTab) return
    props.onTabChange(next.key)
  }

  onMount(() => {
    const element = navEl
    if (!element) return
    const handler = (event: Event) => onActivated(event)
    element.addEventListener('navigation-bar-activated', handler)
    onCleanup(() => element.removeEventListener('navigation-bar-activated', handler))
  })

  return (
    <nav class="nav-wrap" aria-label="主导航">
      <md-navigation-bar ref={navEl} class="nav-shell" activeIndex={activeIndex()}>
        {resolvedItems.map((item, index) => (
          <md-navigation-tab
            id={`tab-${item.key}`}
            aria-controls={`panel-${item.key}`}
            label={item.label}
            active={index === activeIndex()}
          ></md-navigation-tab>
        ))}
      </md-navigation-bar>
    </nav>
  )
}
