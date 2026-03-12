// shell.ts — kernelsu exec wrapper

import { exec, toast } from 'kernelsu'

interface ExecResult {
  errno: number
  stdout: string
  stderr: string
}

interface KernelSuHost {
  close?: () => void
}

// Module paths following KernelSU module convention
const MODULE_DIR = '/data/adb/modules/rime_helper'
const HELPER = `${MODULE_DIR}/scripts/helper.sh`

// Persistent data dir (survives module updates)
export const PERSIST_DIR = '/data/adb/rime_helper'

export function shellQuote(input: string): string {
  return `'${input.replace(/'/g, `"'"'`)}'`
}

async function ksuExec(command: string): Promise<ExecResult> {
  try {
    const result = await exec(command)
    return result as ExecResult
  } catch {
    console.warn('[shell] kernelsu not available, returning mock')
    return { errno: -1, stdout: '', stderr: 'kernelsu not available' }
  }
}

export function closeWebUi(): void {
  const host = (globalThis as typeof globalThis & { ksu?: KernelSuHost }).ksu
  if (typeof host?.close === 'function') {
    host.close()
    return
  }

  if (typeof window.close === 'function') {
    window.close()
    setTimeout(() => {
      toast('当前宿主未提供直接关闭能力，请手动退出 WebUI')
    }, 150)
    return
  }

  toast('当前宿主未提供直接关闭能力，请手动退出 WebUI')
}

/** Run helper.sh with given subcommand and args, return stdout */
export async function execHelper(subcommand: string, args: string = ''): Promise<string> {
  const cmd = `sh ${HELPER} ${subcommand} ${args}`.trim()
  const result = await ksuExec(cmd)
  if (result.errno !== 0 && !result.stdout) {
    throw new Error(result.stderr || `helper.sh ${subcommand} exited with code ${result.errno}`)
  }
  return result.stdout
}

/** Run helper.sh, only check exit code (no stdout needed) */
export async function execHelperVoid(subcommand: string, args: string = ''): Promise<void> {
  const cmd = `sh ${HELPER} ${subcommand} ${args}`.trim()
  const result = await ksuExec(cmd)
  if (result.errno !== 0) {
    throw new Error(result.stderr || `helper.sh ${subcommand} failed (code ${result.errno})`)
  }
}
