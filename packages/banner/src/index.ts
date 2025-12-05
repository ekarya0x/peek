export interface PeekBannerOptions {
  wsPort?: number
  onSwitch?: (from: string, to: string) => void
}

export interface PeekState {
  current: string
  main: string
  previous: string | null
}

export function initPeekBanner(options: PeekBannerOptions = {}): () => void {
  const { wsPort = 24789, onSwitch } = options

  let state: PeekState = { current: '', main: '', previous: null }
  let ws: WebSocket | null = null

  const banner = createBanner()
  document.body.appendChild(banner)

  function connect() {
    ws = new WebSocket(`ws://localhost:${wsPort}`)

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'peek:state') {
        state = { current: data.current, main: data.main, previous: data.previous }
        update()
      } else if (data.type === 'peek:switch') {
        state = { current: data.to, main: data.main ?? state.main, previous: data.from }
        update()
        onSwitch?.(data.from, data.to)
      }
    }

    ws.onclose = () => {
      setTimeout(connect, 3000)
    }
  }

  function update() {
    const label = banner.querySelector('.peek-label') as HTMLElement
    const backBtn = banner.querySelector('.peek-back') as HTMLElement
    const isMain = state.current === state.main

    banner.classList.toggle('peeking', !isMain)
    label.textContent = isMain ? 'main' : state.current.split('/').pop() ?? state.current
    backBtn.style.display = isMain ? 'none' : 'block'
    banner.classList.add('visible')
  }

  async function goBack() {
    await fetch('/__peek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '.' })
    })
  }

  async function copyScope() {
    const res = await fetch('/__peek/scope')
    const text = await res.text()
    await navigator.clipboard.writeText(text)

    const btn = banner.querySelector('.peek-copy') as HTMLElement
    btn.textContent = 'Copied!'
    setTimeout(() => { btn.textContent = 'Copy Scope' }, 1500)
  }

  banner.querySelector('.peek-back')?.addEventListener('click', goBack)
  banner.querySelector('.peek-copy')?.addEventListener('click', copyScope)

  connect()

  fetch('/__peek')
    .then(r => r.json())
    .then(data => {
      state = { current: data.current, main: data.main, previous: data.previous }
      update()
    })
    .catch(() => {})

  return () => {
    ws?.close()
    banner.remove()
  }
}

function createBanner(): HTMLDivElement {
  const banner = document.createElement('div')
  banner.id = 'peek-banner'
  banner.innerHTML = `
    <div class="peek-path">
      <span class="peek-dot"></span>
      <span class="peek-label">main</span>
    </div>
    <div class="peek-actions">
      <button class="peek-btn peek-back" style="display:none">Back</button>
      <button class="peek-btn peek-copy">Copy Scope</button>
    </div>
  `
  return banner
}

