import { createStore } from 'solid-js/store'

interface UIState {
  isReady: boolean
  toastOpen: boolean
  toastMessage: string
}

const [state, setState] = createStore<UIState>({
  isReady: false,
  toastOpen: false,
  toastMessage: '',
})

async function init() {
  setState('isReady', true)
}

function showToast(message: string, duration = 2200) {
  setState({ toastOpen: true, toastMessage: message })
  window.setTimeout(() => {
    setState('toastOpen', false)
  }, duration)
}

export const uiStore = {
  get isReady() {
    return state.isReady
  },
  get toastOpen() {
    return state.toastOpen
  },
  get toastMessage() {
    return state.toastMessage
  },
  init,
  showToast,
}
