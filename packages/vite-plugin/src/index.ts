import type { Plugin, ViteDevServer, ResolvedConfig } from 'vite'
import { PeekCore } from '@ekarya0x/middleware'
import { WebSocketServer, WebSocket } from 'ws'

export interface PeekOptions {
  port?: number
  banner?: boolean
}

export function peek(options: PeekOptions = {}): Plugin {
  const { port = 24789, banner = true } = options

  let core: PeekCore
  let wss: WebSocketServer
  let config: ResolvedConfig
  let server: ViteDevServer

  return {
    name: 'vite-plugin-peek',

    configResolved(resolvedConfig) {
      config = resolvedConfig
    },

    configureServer(devServer) {
      server = devServer
      core = new PeekCore({ mainPath: config.root })

      wss = new WebSocketServer({ port })

      wss.on('connection', (ws) => {
        ws.send(JSON.stringify({
          type: 'peek:state',
          ...core.getState(),
          worktrees: core.list()
        }))
      })

      core.on('switch', (event) => {
        broadcast(wss, {
          type: 'peek:switch',
          from: event.from,
          to: event.to,
          info: event.info
        })

        server.ws.send({ type: 'full-reload' })
      })

      server.middlewares.use('/__peek', (req, res, next) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString() })
          req.on('end', async () => {
            try {
              const { path } = JSON.parse(body) as { path: string }
              
              const result = await core.switch(path)
              
              if (result.success) {
                Object.assign(server.config, { root: core.getCurrent() })
              }

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(result))
            } catch {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid request' }))
            }
          })
        } else if (req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            ...core.getState(),
            worktrees: core.list()
          }))
        } else {
          next()
        }
      })

      server.middlewares.use('/__peek/scope', (req, res) => {
        const scope = generateQuickScope(core.getCurrent())
        res.setHeader('Content-Type', 'text/plain')
        res.end(scope)
      })
    },

    transformIndexHtml(html) {
      if (!banner) return html

      const script = `
<script type="module">
(function() {
  const ws = new WebSocket('ws://localhost:${port}');
  let state = { current: '', main: '', isMain: true };

  const banner = document.createElement('div');
  banner.id = 'peek-banner';
  banner.innerHTML = \`
    <style>
      #peek-banner {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 36px;
        background: var(--peek-bg, #0a0a0a);
        color: var(--peek-fg, #fafafa);
        font-family: ui-monospace, 'SF Mono', monospace;
        font-size: 13px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        z-index: 99999;
        border-top: 1px solid var(--peek-border, #262626);
        transform: translateY(100%);
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }
      #peek-banner.visible { transform: translateY(0); }
      #peek-banner.peeking {
        --peek-bg: #0c1929;
        --peek-border: #1e3a5f;
      }
      .peek-path { display: flex; align-items: center; gap: 10px; }
      .peek-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
      }
      #peek-banner.peeking .peek-dot {
        background: #3b82f6;
        animation: peek-pulse 2s infinite;
      }
      @keyframes peek-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .peek-actions { display: flex; gap: 8px; }
      .peek-btn {
        background: transparent;
        border: 1px solid #404040;
        color: inherit;
        padding: 4px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.15s;
      }
      .peek-btn:hover { background: #262626; border-color: #525252; }
    </style>
    <div class="peek-path">
      <span class="peek-dot"></span>
      <span class="peek-label">main</span>
    </div>
    <div class="peek-actions">
      <button class="peek-btn peek-back" style="display:none">Back</button>
      <button class="peek-btn peek-copy">Copy Scope</button>
    </div>
  \`;
  document.body.appendChild(banner);

  function update() {
    const label = banner.querySelector('.peek-label');
    const backBtn = banner.querySelector('.peek-back');
    const isMain = state.current === state.main;
    
    banner.classList.toggle('peeking', !isMain);
    label.textContent = isMain ? 'main' : state.current.split('/').pop();
    backBtn.style.display = isMain ? 'none' : 'block';
    banner.classList.add('visible');
  }

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'peek:state' || data.type === 'peek:switch') {
      state = { current: data.current || data.to, main: data.main, isMain: false };
      update();
    }
  };

  banner.querySelector('.peek-back').onclick = () => {
    fetch('/__peek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '.' })
    });
  };

  banner.querySelector('.peek-copy').onclick = async () => {
    const res = await fetch('/__peek/scope');
    const text = await res.text();
    await navigator.clipboard.writeText(text);
    const btn = banner.querySelector('.peek-copy');
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy Scope', 1500);
  };

  fetch('/__peek').then(r => r.json()).then(data => {
    state = { current: data.current, main: data.main, isMain: data.current === data.main };
    update();
  });
})();
</script>`

      return html.replace('</body>', `${script}</body>`)
    }
  }
}

function broadcast(wss: WebSocketServer, data: unknown) {
  const msg = JSON.stringify(data)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg)
    }
  })
}

function generateQuickScope(path: string): string {
  return `# Worktree: ${path}

Working directory for AI agent context.
All paths relative to this root.
`
}

export default peek

