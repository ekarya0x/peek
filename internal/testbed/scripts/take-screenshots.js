#!/usr/bin/env node
/**
 * Minimal screenshot runner for the peek testbed.
 * Starts Vite and Next dev servers, waits for them to be ready, then captures screenshots.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium } from 'playwright'

const testbedRoot = resolve(new URL('.', import.meta.url).pathname, '..')
const workspaceRoot = resolve(testbedRoot, '..', '..')
const screenshotDir = join(testbedRoot, 'screenshots')

async function waitForReady(url, attempts = 80, intervalMs = 250) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // ignore until ready
    }
    await delay(intervalMs)
  }
  throw new Error(`Server not ready at ${url} after ${attempts * intervalMs}ms`)
}

function startServer(label, args, cwd) {
  const proc = spawn('pnpm', args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, FORCE_COLOR: '1' }
  })

  const stop = () =>
    new Promise((resolveStop) => {
      proc.on('close', () => resolveStop())
      proc.kill('SIGINT')
      setTimeout(() => proc.kill('SIGKILL'), 2000)
    })

  return { proc, stop, label }
}

async function screenshot(url, file) {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.screenshot({ path: file, fullPage: true })
  await browser.close()
}

async function run() {
  if (!existsSync(screenshotDir)) {
    mkdirSync(screenshotDir, { recursive: true })
  }

  // Vite app
  const vite = startServer('vite', ['dev', '--', '--host', '--port', '5173'], join(testbedRoot, 'apps', 'vite-app'))
  await waitForReady('http://localhost:5173')
  await screenshot('http://localhost:5173', join(screenshotDir, 'screenshot_vite.png'))
  await vite.stop()

  // Next app
  const next = startServer('next', ['dev', '--hostname', 'localhost', '--port', '3000'], join(testbedRoot, 'apps', 'next-app'))
  await waitForReady('http://localhost:3000')
  await screenshot('http://localhost:3000', join(screenshotDir, 'screenshot_next.png'))
  await next.stop()

  console.log(`\nScreenshots saved to ${screenshotDir}`)
}

run().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})

