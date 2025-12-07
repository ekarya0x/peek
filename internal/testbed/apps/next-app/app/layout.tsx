import type { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Peek Next Testbed',
  description: 'Next.js sandbox for @peektree packages'
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

