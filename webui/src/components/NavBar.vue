<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { NavItem, ViewName } from '@/types'
import { closeWebUi } from '@/api/shell'

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
    <div class="navbar">
      <button
        v-for="item in navItems"
        :key="item.name"
        class="nav-item"
        :class="{ active: isActive(item.name), pending: isPending(item.name) }"
        @click="navigate(item.name)"
      >
        <span class="nav-indicator"></span>
        <span class="nav-label">{{ item.label }}</span>
      </button>
      <button class="nav-close" @click="closeWebUi" aria-label="关闭 WebUI">
        <span class="nav-close-icon">×</span>
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
  padding: 10px 12px calc(12px + env(safe-area-inset-bottom));
  z-index: 100;
  pointer-events: none;
}

.navbar {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 1px solid color-mix(in srgb, var(--outline-variant) 82%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--bg) 84%, var(--surface) 16%);
  box-shadow: var(--shadow-2);
  backdrop-filter: blur(14px);
  pointer-events: auto;
}

.nav-item {
  flex: 1;
  min-height: 46px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 8px 6px;
  border: none;
  border-radius: 14px;
  background: transparent;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: color 0.18s ease, background-color 0.18s ease, transform 0.18s ease, opacity 0.18s ease, box-shadow 0.18s ease;
}

.nav-item:hover {
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-muted) 70%, transparent);
}

.nav-item:active {
  transform: translateY(1px);
  background: color-mix(in srgb, var(--surface-muted) 88%, transparent);
}

.nav-item:focus-visible,
.nav-close:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--primary) 60%, transparent);
  outline-offset: 1px;
}

.nav-item.active {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary-soft) 76%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary) 16%, transparent);
}

.nav-item.pending {
  opacity: 0.72;
}

.nav-close {
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 14px;
  background: color-mix(in srgb, var(--error-soft) 88%, var(--surface) 12%);
  color: var(--error);
  cursor: pointer;
  transition: background-color 0.18s ease, transform 0.18s ease, color 0.18s ease;
}

.nav-close:hover {
  background: color-mix(in srgb, var(--error-soft) 100%, var(--surface) 0%);
}

.nav-close:active {
  transform: translateY(1px);
}

.nav-close-icon {
  font-size: 22px;
  line-height: 1;
  font-weight: 500;
}

.nav-indicator {
  width: 14px;
  height: 3px;
  border-radius: 999px;
  background: transparent;
  transition: background-color 0.2s ease, width 0.2s ease;
}

.nav-item.active .nav-indicator {
  width: 22px;
  background: var(--primary);
}

.nav-label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1px;
}
</style>
