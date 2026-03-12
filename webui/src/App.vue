<script setup lang="ts">
import NavBar from './components/NavBar.vue'
</script>

<template>
  <div class="app">
    <NavBar />
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style>
@import './styles/tokens.css';

:root {
  --bg: var(--vp-c-bg);
  --card-bg: var(--vp-c-bg-soft);
  --surface: var(--vp-c-bg-soft);
  --surface-muted: var(--vp-c-bg-mute);

  --text: var(--vp-c-text-1);
  --text-secondary: var(--vp-c-text-2);
  --text-tertiary: var(--vp-c-text-3);

  --primary: var(--vp-c-brand-1);
  --primary-hover: var(--vp-c-brand-2);
  --primary-active: var(--vp-c-brand-3);
  --primary-soft: var(--vp-c-brand-soft);

  --success: var(--vp-c-success-1);
  --success-soft: var(--vp-c-success-soft);
  --warning: var(--vp-c-warning-1);
  --warning-soft: var(--vp-c-warning-soft);
  --error: var(--vp-c-danger-1);
  --error-soft: var(--vp-c-danger-soft);

  --border: var(--vp-c-border);
  --outline-variant: var(--vp-c-divider);

  --radius: var(--vp-radius-medium);
  --radius-small: var(--vp-radius-small);
  --radius-large: var(--vp-radius-large);

  --shadow: var(--vp-shadow-1);
  --shadow-2: var(--vp-shadow-2);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.app {
  min-height: 100vh;
  padding-bottom: 104px;
}

.main-content {
  padding: 16px;
  max-width: 640px;
  margin: 0 auto;
}

.page-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.1px;
}

.section-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: -8px;
}

.card {
  background: var(--surface);
  border: 1px solid var(--outline-variant);
  border-radius: var(--radius);
  padding: 14px;
  margin-bottom: 10px;
  box-shadow: var(--shadow);
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.meta-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid transparent;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.18s, border-color 0.18s, color 0.18s, box-shadow 0.18s, transform 0.18s;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:active:not(:disabled) {
  transform: translateY(0);
}

.btn:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--primary) 58%, transparent);
  outline-offset: 1px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary);
  color: var(--vp-c-white);
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-primary:active:not(:disabled) {
  background: var(--primary-active);
}

.btn-outline {
  background: transparent;
  color: var(--text);
  border-color: var(--outline-variant);
}

.btn-outline:hover:not(:disabled) {
  background: color-mix(in srgb, var(--surface-muted) 72%, transparent);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: transparent;
}

.btn-ghost:hover:not(:disabled) {
  background: color-mix(in srgb, var(--surface-muted) 62%, transparent);
  color: var(--text);
}

.btn-block {
  width: 100%;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
}

.badge-success {
  background: var(--success-soft);
  color: var(--success);
}

.badge-warning {
  background: var(--warning-soft);
  color: var(--warning);
}

.badge-error {
  background: var(--error-soft);
  color: var(--error);
}

.state-text {
  text-align: center;
  padding: 18px 12px;
  color: var(--text-secondary);
  font-size: 14px;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: var(--outline-variant);
  border-radius: 24px;
  transition: 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  bottom: 3px;
  background: var(--vp-c-white);
  border-radius: 50%;
  transition: 0.2s;
}

.toggle input:checked + .toggle-slider {
  background: var(--primary);
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}
</style>
