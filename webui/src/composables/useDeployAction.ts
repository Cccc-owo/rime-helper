import { ref } from 'vue'
import { useOpStatus } from './useOpStatus'

interface DeployActionOptions {
  preHint?: string
  basePendingMessage?: string
  successMessage: string
  failPrefix?: string
}

export function useDeployAction() {
  const deploying = ref(false)
  const {
    message,
    error,
    clear,
    setMessage,
    setError,
    formatError,
  } = useOpStatus()

  async function run(action: () => Promise<void>, options: DeployActionOptions) {
    clear()
    deploying.value = true

    const pending = options.preHint
      ? `${options.basePendingMessage ?? '正在将文件同步到已选择的输入法数据目录，请稍候...'} ${options.preHint}`
      : (options.basePendingMessage ?? '正在将文件同步到已选择的输入法数据目录，请稍候...')
    setMessage(pending)

    try {
      await action()
      setMessage(options.successMessage)
    } catch (e) {
      setError(`${options.failPrefix ?? '文件同步失败'}：${formatError(e)}。详情见「同步」页日志`)
    } finally {
      deploying.value = false
    }
  }

  return {
    deploying,
    message,
    error,
    clear,
    setMessage,
    setError,
    formatError,
    run,
  }
}
