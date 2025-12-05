import { PeekCore } from '@ekarya0x/middleware'

export async function switchCmd(target: string, port?: string): Promise<void> {
  const core = new PeekCore()
  const resolvedPort = port || process.env.PEEK_PORT || '3000'

  if (target === '-') {
    const result = await core.switchLast()
    if (!result.success) {
      console.error(`Error: ${result.error}`)
      process.exit(1)
    }
    target = core.getCurrent()
  }

  if (target === '.') {
    const result = await core.switchMain()
    if (!result.success) {
      console.error(`Error: ${result.error}`)
      process.exit(1)
    }
    target = core.getMain()
  }

  const result = await core.switch(target)
  if (!result.success) {
    console.error(`Error: ${result.error}`)
    process.exit(1)
  }

  try {
    const res = await fetch(`http://localhost:${resolvedPort}/__peek`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: core.getCurrent() })
    })

    if (!res.ok) {
      console.log(`Switched to ${core.getCurrent()}`)
      console.log('Note: Dev server not responding. Start with peek plugin enabled.')
      return
    }

    const data = await res.json() as { success: boolean; error?: string }
    if (data.success) {
      console.log(`Peeking: ${core.getCurrent()}`)
    } else {
      console.error(`Server error: ${data.error}`)
    }
  } catch {
    console.log(`Switched to ${core.getCurrent()}`)
    console.log('Note: Dev server not responding at port ' + port)
  }
}

