import '../styles/globals.css'
import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ClientLayout } from './ClientLayout'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'AI Social - Create Amazing Art with AI',
  description: 'Transform your ideas into stunning visual art using the power of artificial intelligence.',
  keywords: ['AI art', 'text to image', 'AI creator', 'art generator', 'AI social'],
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#3b74ff',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" className={`${inter.variable}`}>
      <body className="font-sans antialiased bg-bg">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}


