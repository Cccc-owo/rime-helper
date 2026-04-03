import { For, Show, createEffect, createSignal, lazy, onCleanup, onMount } from 'solid-js'
import NavBar from '@/components/NavBar'
import TopBar from '@/components/TopBar'
import Toast from '@/components/Toast'
import { uiStore } from '@/lib/stores/uiStore'
import { disposeAppStore, initApp } from '@/store/appStore'
import type { RouteName } from '@/lib/types'

type TabId = RouteName

const loadDeployTab = () => import('@/routes/DeployTab')
const loadResourcesTab = () => import('@/routes/ResourcesTab')
const loadSettingsTab = () => import('@/routes/SettingsTab')

const routes = [
  { id: 'deploy', label: '同步', load: loadDeployTab, component: lazy(loadDeployTab) },
  { id: 'resources', label: '资源', load: loadResourcesTab, component: lazy(loadResourcesTab) },
  { id: 'settings', label: '设置', load: loadSettingsTab, component: lazy(loadSettingsTab) },
] as const

export default function App() {
  const [activeTab, setActiveTab] = createSignal<TabId>('deploy')
  const [visitedTabs, setVisitedTabs] = createSignal(new Set<TabId>(['deploy']))

  createEffect(() => {
    const current = activeTab()
    setVisitedTabs((prev) => {
      if (prev.has(current)) return prev
      const next = new Set(prev)
      next.add(current)
      return next
    })
  })

  function parseHash(hash: string): RouteName {
    const value = hash.replace('#', '')
    if (value === '/resources') return 'resources'
    if (value === '/settings') return 'settings'
    return 'deploy'
  }

  const onHashChange = () => {
    setActiveTab(parseHash(window.location.hash))
  }

  onMount(() => {
    if (!window.location.hash) window.location.hash = '#/deploy'
    onHashChange()
    void Promise.all([uiStore.init(), initApp()])
    window.addEventListener('hashchange', onHashChange)

    const pendingRoutes = routes.filter(route => route.id !== activeTab())
    let timer = 0
    let nextIndex = 0
    const preloadNext = () => {
      const nextRoute = pendingRoutes[nextIndex++]
      if (!nextRoute) return
      void nextRoute.load()
      if (nextIndex < pendingRoutes.length) {
        timer = window.setTimeout(preloadNext, 100)
      }
    }
    timer = window.setTimeout(preloadNext, 220)
    onCleanup(() => window.clearTimeout(timer))
  })

  onCleanup(() => {
    window.removeEventListener('hashchange', onHashChange)
    disposeAppStore()
  })

  const onTabChange = (route: RouteName) => {
    setActiveTab(route)
    window.location.hash = `/${route}`
  }

  return (
    <div class="app-root">
      <Show
        when={uiStore.isReady}
        fallback={
          <div class="loading-container">
            <md-linear-progress indeterminate></md-linear-progress>
            <span class="loading-text">正在加载数据...</span>
          </div>
        }
      >
        <TopBar />
        <main class="content">
          <div class="tabs-stack">
            <For each={routes}>
              {(route) => (
                <section
                  role="tabpanel"
                  id={`panel-${route.id}`}
                  class={`tab-panel ${activeTab() === route.id ? 'active' : 'inactive'}`}
                  aria-labelledby={`tab-${route.id}`}
                >
                  <Show when={visitedTabs().has(route.id)}>
                    <route.component />
                  </Show>
                </section>
              )}
            </For>
          </div>
        </main>
        <NavBar activeTab={activeTab()} onTabChange={onTabChange} tabs={routes.map(route => ({ id: route.id, label: route.label }))} />
      </Show>
      <Toast />
    </div>
  )
}
