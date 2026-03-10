import { ref } from 'vue'

export function useOpStatus() {
  const message = ref('')
  const error = ref('')

  function clear() {
    message.value = ''
    error.value = ''
  }

  function setMessage(value: string) {
    message.value = value
    error.value = ''
  }

  function setError(value: string) {
    error.value = value
    message.value = ''
  }

  function formatError(e: unknown): string {
    return e instanceof Error ? e.message : String(e)
  }

  return {
    message,
    error,
    clear,
    setMessage,
    setError,
    formatError,
  }
}
