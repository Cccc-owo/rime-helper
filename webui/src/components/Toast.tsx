import { Show } from 'solid-js'
import { uiStore } from '@/lib/stores/uiStore'

export default function Toast() {
  return (
    <Show when={uiStore.toastOpen}>
      <div class="snackbar-wrap">
        <md-filled-card class="snackbar" role="status" aria-live="polite">
          {uiStore.toastMessage}
        </md-filled-card>
      </div>
    </Show>
  )
}
