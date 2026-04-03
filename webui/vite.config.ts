import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [solid()],
  base: './',
  build: {
    outDir: fileURLToPath(new URL('../module/webroot', import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
