#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const scriptDir = resolve(new URL('.', import.meta.url).pathname)
const testbedRoot = resolve(scriptDir, '..')
const repoRoot = resolve(testbedRoot, '..', '..')
const screenshotDir = join(testbedRoot, 'screenshots')
const cli = join(repoRoot, 'packages', 'cli', 'dist', 'index.js')

const commands = [
  { name: 'cli_help', cmd: `node ${cli} --help`, cwd: repoRoot },
  { name: 'cli_ls', cmd: `node ${cli} ls`, cwd: repoRoot },
  { name: 'cli_doctor', cmd: `node ${cli} doctor`, cwd: repoRoot },
  { name: 'cli_metrics', cmd: `node ${cli} metrics`, cwd: repoRoot },
  { name: 'cli_chaos', cmd: 'pnpm test:chaos', cwd: repoRoot },
  { name: 'cli_quick_suite', cmd: 'pnpm run quick-suite', cwd: testbedRoot },
  { name: 'cli_screenshot_suite', cmd: 'pnpm run screenshot-suite', cwd: testbedRoot },
  { name: 'cli_testbed_doctor', cmd: `node ${cli} doctor`, cwd: testbedRoot }
]

function htmlEscape(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function runCommand({ cmd, cwd }) {
  try {
    const out = execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
    return { text: out.trim(), ok: true }
  } catch (e) {
    const stdout = e.stdout?.toString() ?? ''
    const stderr = e.stderr?.toString() ?? e.message
    return { text: (stdout + '\n' + stderr).trim(), ok: false }
  }
}

async function capture(name, text, browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const content = `
    <style>
      body { margin: 0; background: #0b0d11; color: #e7e9ec; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; padding: 16px; }
      pre { white-space: pre-wrap; word-break: break-word; }
      .name { color: #7dd3fc; margin-bottom: 12px; }
    </style>
    <div class="name">${name}</div>
    <pre>${htmlEscape(text)}</pre>
  `
  await page.setContent(content)
  await page.screenshot({ path: join(screenshotDir, `${name}.png`) })
  await page.close()
}

async function main() {
  if (!existsSync(screenshotDir)) {
    mkdirSync(screenshotDir, { recursive: true })
  }

  const browser = await chromium.launch({ headless: true })
  for (const entry of commands) {
    const result = runCommand(entry)
    await capture(entry.name, result.text, browser)
  }
  await browser.close()
  console.log('CLI screenshots saved to', screenshotDir)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

