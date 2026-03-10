import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/deploy' },
    { path: '/deploy', component: () => import('./views/DeployView.vue') },
    { path: '/resources', component: () => import('./views/ResourcesView.vue') },
    { path: '/settings', component: () => import('./views/SettingsView.vue') },
  ],
})

createApp(App).use(router).mount('#app')
