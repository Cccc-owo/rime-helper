import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import DeployView from './views/DeployView.vue'
import ResourcesView from './views/ResourcesView.vue'
import SettingsView from './views/SettingsView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/deploy' },
    { path: '/deploy', component: DeployView },
    { path: '/resources', component: ResourcesView },
    { path: '/settings', component: SettingsView },
  ],
})

createApp(App).use(router).mount('#app')
