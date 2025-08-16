import '../styles/globals.css'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { ClientLayout } from './ClientLayout'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata = {
  title: 'AI Social - Create Amazing Art with AI',
  description: 'Transform your ideas into stunning visual art using the power of artificial intelligence.',
  keywords: ['AI art', 'text to image', 'AI creator', 'art generator', 'AI social'],
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#3b74ff',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className={`${inter.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-sans antialiased bg-bg">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}


