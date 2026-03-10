/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'kernelsu' {
  export function exec(command: string): Promise<{ errno: number; stdout: string; stderr: string }>
  export function toast(message: string): void
}
