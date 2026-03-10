<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import type { NavItem, ViewName } from '@/types'

const router = useRouter()
const route = useRoute()

const navItems: NavItem[] = [
  { name: 'deploy', label: '同步', icon: '' },
  { name: 'resources', label: '资源', icon: '' },
  { name: 'settings', label: '设置', icon: '' },
]

function navigate(name: ViewName) {
  router.push(`/${name}`)
}

function isActive(name: ViewName): boolean {
  return route.path === `/${name}`
}
</script>

<template>
  <nav class="navbar">
    <button
      v-for="item in navItems"
      :key="item.name"
      class="nav-item"
      :class="{ active: isActive(item.name) }"
      @click="navigate(item.name)"
    >
      <span class="nav-indicator"></span>
      <span class="nav-label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 6px;
  background: color-mix(in srgb, var(--bg) 90%, var(--surface) 10%);
  border-top: 1px solid color-mix(in srgb, var(--outline-variant) 76%, transparent);
  padding: 10px 10px calc(10px + env(safe-area-inset-bottom));
  backdrop-filter: blur(10px);
  z-index: 100;
}

.nav-item {
  flex: 1;
  min-height: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 4px;
  border: none;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: color 0.18s ease, background-color 0.18s ease, transform 0.18s ease;
}

.nav-item:hover {
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--surface-muted) 60%, transparent);
}

.nav-item:active {
  transform: translateY(1px);
  background: color-mix(in srgb, var(--surface-muted) 85%, transparent);
}

.nav-item:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--primary) 60%, transparent);
  outline-offset: 1px;
}

.nav-item.active {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary-soft) 68%, transparent);
}

.nav-indicator {
  width: 14px;
  height: 2px;
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
