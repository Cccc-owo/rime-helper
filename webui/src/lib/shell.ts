// @ts-ignore kernelsu package does not ship type declarations
import { exec } from 'kernelsu'

interface ExecResult {
  errno: number
  stdout: string
  stderr: string
}

const MODULE_DIR = '/data/adb/modules/rime_helper'
const HELPER = `${MODULE_DIR}/scripts/helper.sh`

export function shellQuote(input: string): string {
  return `'${input.replace(/'/g, `"'"'`)}'`
}

async function ksuExec(command: string): Promise<ExecResult> {
  try {
    return await exec(command) as ExecResult
  } catch {
    return { errno: -1, stdout: '', stderr: 'kernelsu not available' }
  }
}

export async function execHelper(subcommand: string, args = ''): Promise<string> {
  const cmd = `sh ${HELPER} ${subcommand} ${args}`.trim()
  const result = await ksuExec(cmd)
  if (result.errno !== 0 && !result.stdout) {
    throw new Error(result.stderr || `helper.sh ${subcommand} exited with code ${result.errno}`)
  }
  return result.stdout
}

export async function execHelperVoid(subcommand: string, args = ''): Promise<void> {
  const cmd = `sh ${HELPER} ${subcommand} ${args}`.trim()
  const result = await ksuExec(cmd)
  if (result.errno !== 0) {
    throw new Error(result.stderr || `helper.sh ${subcommand} failed (code ${result.errno})`)
  }
}
