/// <reference types="vite/client" />

import 'solid-js'

declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'md-filled-button': any
      'md-filled-tonal-button': any
      'md-outlined-button': any
      'md-text-button': any
      'md-outlined-text-field': any
      'md-outlined-select': any
      'md-select-option': any
      'md-switch': any
      'md-assist-chip': any
      'md-filled-card': any
      'md-outlined-card': any
      'md-divider': any
      'md-navigation-bar': any
      'md-navigation-tab': any
      'md-list': any
      'md-list-item': any
      'md-linear-progress': any
    }
  }
}

declare module 'kernelsu' {
  export function exec(command: string): Promise<{ errno: number; stdout: string; stderr: string }>
  export function toast(message: string): void
  export function fullScreen(isFullScreen: boolean): void
}
