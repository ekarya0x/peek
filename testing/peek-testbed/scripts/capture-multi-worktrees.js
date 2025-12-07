#!/usr/bin/env node
import { execSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const scriptDir = resolve(new URL('.', import.meta.url).pathname)
const testbedRoot = resolve(scriptDir, '..')
const repoRoot = resolve(testbedRoot, '..', '..')
const screenshotsDir = join(testbedRoot, 'screenshots')
const cli = join(repoRoot, 'packages', 'cli', 'dist', 'index.js')

function run(cmd, cwd = repoRoot) {
  try {
    return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
  } catch (e) {
    const out = (e.stdout?.toString() ?? '') + (e.stderr?.toString() ?? e.message)
    return out.trim()
  }
}

async function waitForReady(url, attempts = 60, intervalMs = 250) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // keep waiting
    }
    await delay(intervalMs)
  }
  throw new Error(`Server not ready at ${url}`)
}

function startVite() {
  const proc = spawn('pnpm', ['--filter', 'peek-test-vite', 'dev', '--', '--host', '--port', '5173'], {
    cwd: testbedRoot,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  })
  return () =>
    new Promise((resolveStop) => {
      proc.on('close', () => resolveStop())
      proc.kill('SIGINT')
      setTimeout(() => proc.kill('SIGKILL'), 2000)
    })
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function captureBrowser(url, file) {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.screenshot({ path: file })
  await browser.close()
}

async function main() {
  if (!existsSync(screenshotsDir)) mkdirSync(screenshotsDir, { recursive: true })

  // Create three worktrees
  const logStart = []
  logStart.push(run(`node ${cli} s main`))
  logStart.push(run(`node ${cli} s feature-auth`))
  logStart.push(run(`node ${cli} s bugfix-123`))

  const lsOutput = run(`node ${cli} ls`)

  // Start Vite and wait
  const stopVite = startVite()
  await waitForReady('http://localhost:5173')

  // Capture main banner
  const mainShot = join(screenshotsDir, 'screenshot_vite_main.png')
  await captureBrowser('http://localhost:5173', mainShot)

  // Switch to feature and capture
  const switchOutput = run(`node ${cli} s feature-auth`)
  await delay(1000)
  const featureShot = join(screenshotsDir, 'screenshot_vite_feature.png')
  await captureBrowser('http://localhost:5173', featureShot)

  // Switch back to main for completeness
  const backOutput = run(`node ${cli} s main`)
  await delay(500)

  await stopVite()

  // Build composite HTML
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.setContent(`
    <style>
      body { margin: 0; background: #0b0d11; color: #e7e9ec; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; padding: 16px; }
      h1 { margin: 0 0 12px 0; color: #7dd3fc; }
      pre { white-space: pre-wrap; word-break: break-word; background: #0f172a; border: 1px solid #1f2937; border-radius: 8px; padding: 12px; margin: 0 0 12px 0; }
      .row { display: flex; gap: 12px; }
      .col { flex: 1; display: flex; flex-direction: column; gap: 12px; }
      img { border: 1px solid #1f2937; border-radius: 8px; }
    </style>
    <h1>Multiple Worktrees Live</h1>
    <pre>${esc(logStart.join('\\n'))}\\n\\n${esc(lsOutput)}\\n\\n${esc(switchOutput)}\\n${esc(backOutput)}</pre>
    <div class="row">
      <div class="col">
        <div>Vite: main</div>
        <img src="file://${mainShot}">
      </div>
      <div class="col">
        <div>Vite: feature-auth</div>
        <img src="file://${featureShot}">
      </div>
    </div>
  `)
  const composite = join(screenshotsDir, 'screenshot_multiple_worktrees.png')
  await page.screenshot({ path: composite, fullPage: true })
  await browser.close()

  console.log('Composite saved to', composite)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

