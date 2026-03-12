<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { NavItem, ViewName } from '@/types'

const router = useRouter()
const route = useRoute()
const navigating = ref<ViewName | null>(null)

const navItems: NavItem[] = [
  { name: 'deploy', label: '同步', icon: '' },
  { name: 'resources', label: '资源', icon: '' },
  { name: 'settings', label: '设置', icon: '' },
]

function isActive(name: ViewName): boolean {
  return route.path === `/${name}`
}

function isPending(name: ViewName): boolean {
  return navigating.value === name
}

async function yieldToUiPaint() {
  await new Promise<void>(resolve => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve())
      return
    }
    setTimeout(resolve, 0)
  })
}

async function navigate(name: ViewName) {
  if (isActive(name) || isPending(name)) return
  navigating.value = name
  await yieldToUiPaint()
  try {
    await router.push(`/${name}`)
  } finally {
    navigating.value = null
  }
}
</script>

<template>
  <nav class="navbar-wrap">
    <div class="navbar" role="tablist" aria-label="主导航">
      <button
        v-for="item in navItems"
        :key="item.name"
        class="nav-item"
        :class="{ active: isActive(item.name), pending: isPending(item.name) }"
        :aria-selected="isActive(item.name)"
        @click="navigate(item.name)"
      >
        <span class="nav-icon" aria-hidden="true"></span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.navbar-wrap {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 0 12px calc(12px + env(safe-area-inset-bottom));
  z-index: 100;
  pointer-events: none;
}

.navbar {
  max-width: 640px;
  min-height: 80px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
  padding: 8px 6px 10px;
  border-top: 1px solid color-mix(in srgb, var(--outline-variant) 88%, transparent);
  background: color-mix(in srgb, var(--bg) 92%, var(--surface) 8%);
  box-shadow: 0 -8px 24px color-mix(in srgb, var(--bg) 20%, transparent);
  backdrop-filter: blur(18px);
  pointer-events: auto;
}

.nav-item {
  position: relative;
  min-height: 62px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 6px;
  border: none;
  border-radius: 16px;
  background: transparent;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: color 0.18s ease, background-color 0.18s ease, transform 0.18s ease, opacity 0.18s ease;
}

.nav-item:hover {
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-muted) 58%, transparent);
}

.nav-item:active {
  transform: translateY(1px);
}

.nav-item:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--primary) 60%, transparent);
  outline-offset: -2px;
}

.nav-item.active {
  color: var(--primary);
}

.nav-item.pending {
  opacity: 0.72;
}

.nav-icon {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-muted) 76%, transparent);
  transition: background-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.nav-item.active .nav-icon {
  background: color-mix(in srgb, var(--primary-soft) 90%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary) 22%, transparent);
  transform: scale(1.02);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 3px;
  border-radius: 999px;
  background: var(--primary);
}

.nav-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.15px;
}
</style>
