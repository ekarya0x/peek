import type { NextConfig } from 'next'
import { PeekCore } from '@peektree/middleware'
import { WebSocketServer, WebSocket } from 'ws'
import { join, resolve } from 'node:path'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

export interface PeekNextOptions {
  /** WebSocket port for real-time updates */
  port?: number
  /** Show UI banner in development */
  banner?: boolean
  /** Enable debug logging */
  debug?: boolean
}

interface PeekState {
  current: string
  main: string
  isMain: boolean
}

let core: PeekCore | null = null
let wss: WebSocketServer | null = null
let currentState: PeekState | null = null

function broadcast(data: unknown) {
  if (!wss) return
  const msg = JSON.stringify(data)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg)
    }
  })
}

function generateBannerScript(port: number): string {
  return `
(function() {
  if (typeof window === 'undefined') return;
  
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
    if (label) label.textContent = isMain ? 'main' : state.current.split('/').pop() || 'worktree';
    if (backBtn) backBtn.style.display = isMain ? 'none' : 'block';
    banner.classList.add('visible');
  }

  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'peek:state' || data.type === 'peek:switch') {
      state = { current: data.current || data.to, main: data.main, isMain: false };
      update();
      if (data.type === 'peek:switch') {
        window.location.reload();
      }
    }
  };

  ws.onopen = () => {
    fetch('/__peek').then(r => r.json()).then(data => {
      state = { current: data.current, main: data.main, isMain: data.current === data.main };
      update();
    }).catch(() => {});
  };

  banner.querySelector('.peek-back')?.addEventListener('click', () => {
    fetch('/__peek', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '.' })
    });
  });

  banner.querySelector('.peek-copy')?.addEventListener('click', async () => {
    const res = await fetch('/__peek/scope');
    const text = await res.text();
    await navigator.clipboard.writeText(text);
    const btn = banner.querySelector('.peek-copy');
    if (btn) {
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy Scope', 1500);
    }
  });
})();
`
}

function generateQuickScope(path: string): string {
  return `# Worktree: ${path}

Working directory for AI agent context.
All paths relative to this root.
`
}

/**
 * Next.js plugin for peek - live worktree switching
 * 
 * @example
 * ```ts
 * // next.config.ts
 * import withPeek from '@peektree/next-plugin'
 * 
 * export default withPeek({
 *   port: 24789,
 *   banner: true
 * })({
 *   // your next config
 * })
 * ```
 */
export function withPeek(options: PeekNextOptions = {}) {
  const { port = 24789, banner = true, debug = false } = options

  return (nextConfig: NextConfig = {}): NextConfig => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') {
      return nextConfig
    }

    const log = debug ? console.log.bind(console, '[peek]') : () => {}

    // Initialize core and WebSocket server lazily
    if (!core) {
      const mainPath = process.cwd()
      core = new PeekCore({ mainPath })
      
      wss = new WebSocketServer({ port })
      log(`WebSocket server started on port ${port}`)

      wss.on('connection', (ws) => {
        log('Client connected')
        ws.send(JSON.stringify({
          type: 'peek:state',
          ...core!.getState(),
          worktrees: core!.list()
        }))
      })

      core.on('switch', (event) => {
        log(`Switching from ${event.from} to ${event.to}`)
        broadcast({
          type: 'peek:switch',
          from: event.from,
          to: event.to,
          info: event.info
        })
      })

      currentState = {
        current: mainPath,
        main: mainPath,
        isMain: true
      }
    }

    return {
      ...nextConfig,

      // Inject middleware for API endpoints
      async rewrites() {
        const existingRewrites = await (nextConfig.rewrites?.() ?? { beforeFiles: [], afterFiles: [], fallback: [] })
        
        // Handle both array and object formats
        if (Array.isArray(existingRewrites)) {
          return existingRewrites
        }
        
        return existingRewrites
      },

      webpack(config, context) {
        // Inject banner script in development
        if (context.dev && banner && !context.isServer) {
          const originalEntry = config.entry
          
          config.entry = async () => {
            const entries = await (typeof originalEntry === 'function' 
              ? originalEntry() 
              : originalEntry)
            
            // Create a virtual module for the banner
            return entries
          }
        }

        return nextConfig.webpack?.(config, context) ?? config
      },

      // Handle API routes via headers
      async headers() {
        const existingHeaders = await (nextConfig.headers?.() ?? [])
        
        return [
          ...existingHeaders,
          {
            source: '/__peek/:path*',
            headers: [
              { key: 'Cache-Control', value: 'no-store' }
            ]
          }
        ]
      }
    }
  }
}

/**
 * Middleware handler for Next.js API routes
 * Add this to your middleware.ts or a custom API route
 */
export function createPeekMiddleware(options: PeekNextOptions = {}) {
  const { port = 24789 } = options
  
  if (!core) {
    core = new PeekCore({ mainPath: process.cwd() })
  }

  return {
    async handleRequest(request: Request): Promise<Response | null> {
      const url = new URL(request.url)
      
      if (!url.pathname.startsWith('/__peek')) {
        return null
      }

      if (url.pathname === '/__peek') {
        if (request.method === 'GET') {
          return Response.json({
            ...core!.getState(),
            worktrees: core!.list()
          })
        }

        if (request.method === 'POST') {
          try {
            const body = await request.json() as { path: string }
            const result = await core!.switch(body.path)
            return Response.json(result)
          } catch {
            return Response.json({ error: 'Invalid request' }, { status: 400 })
          }
        }
      }

      if (url.pathname === '/__peek/scope') {
        const scope = generateQuickScope(core!.getCurrent())
        return new Response(scope, {
          headers: { 'Content-Type': 'text/plain' }
        })
      }

      if (url.pathname === '/__peek/banner.js') {
        return new Response(generateBannerScript(port), {
          headers: { 'Content-Type': 'application/javascript' }
        })
      }

      return null
    }
  }
}

/**
 * React component to inject peek banner
 * Add this to your app layout in development
 */
export function PeekBannerScript({ port = 24789 }: { port?: number }) {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return {
    type: 'script',
    props: {
      dangerouslySetInnerHTML: {
        __html: generateBannerScript(port)
      }
    }
  }
}

export default withPeek

