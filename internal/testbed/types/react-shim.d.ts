import type { ReactNode } from '../../../../packages/banner/node_modules/@types/react'

declare module 'react' {
  export * from '../../../../packages/banner/node_modules/@types/react'
}

declare module 'react/jsx-runtime' {
  export * from '../../../../packages/banner/node_modules/@types/react/jsx-runtime'
}

declare module 'react-dom' {
  export * from 'react'
  export interface Root {
    render(children: ReactNode): void
  }
  export function createRoot(container: Element | DocumentFragment): Root
}

declare module 'react-dom/client' {
  interface Root {
    render(children: ReactNode): void
  }
  function createRoot(container: Element | DocumentFragment): Root
  export { createRoot }
}

declare module 'vite/client' {
  export interface ImportMetaEnv {
    readonly [key: string]: unknown
  }
  export interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

declare module '@vitejs/plugin-react' {
  import type { PluginOption } from 'vite'
  export default function pluginReact(options?: Record<string, unknown>): PluginOption
}

declare module '@peektree/vite-plugin' {
  import type { PluginOption } from 'vite'
  export default function peek(options?: Record<string, unknown>): PluginOption
}

