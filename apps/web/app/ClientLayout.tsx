'use client'

import { ReactNode, useState } from 'react'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar'
import { Header } from '@/components/ui/header'
import { Button } from '@/components/ui/button'
import { CreateArtworkModal } from '@/components/app/CreateArtworkModal'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

interface ClientLayoutProps {
  children: ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  return (
    <div className="min-h-screen font-sans antialiased bg-bg">
      {/* Header */}
      <Header onOpenCreateModal={() => setIsCreateModalOpen(true)} />
      
      <div className="md:flex">
        {/* Sidebar for Desktop */}
        <aside className="hidden md:block" style={{ width: isSidebarCollapsed ? 64 : 256 }}>
          <Sidebar isOpen collapsed={isSidebarCollapsed} onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}>
            <SidebarHeader className="hidden" />
            <SidebarContent className="p-2">
              <nav className="flex flex-col space-y-1">
                <Link className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/">{isSidebarCollapsed ? '🏠' : '首页 / Landing'}</Link>
                <Link className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/features">{isSidebarCollapsed ? '📘' : '功能介绍'}</Link>
                <Link className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/feed">{isSidebarCollapsed ? '🖼️' : '推荐 Feed'}</Link>
                <Link className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/user/me">{isSidebarCollapsed ? '👤' : '我的主页'}</Link>
                <Link className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/artwork">{isSidebarCollapsed ? '🖌️' : '工作台'}</Link>
              </nav>
            </SidebarContent>
          </Sidebar>
        </aside>

        {/* Mobile Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)} collapsed={isSidebarCollapsed}>
          <SidebarHeader className="hidden" />
          <SidebarContent className="p-2">
            <nav className="flex flex-col space-y-1">
              <Link className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/" onClick={() => setIsSidebarOpen(false)}>首页 / Landing</Link>
              <Link className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/features" onClick={() => setIsSidebarOpen(false)}>功能介绍</Link>
              <Link className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/feed" onClick={() => setIsSidebarOpen(false)}>推荐 Feed</Link>
              <Link className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/user/me" onClick={() => setIsSidebarOpen(false)}>我的主页</Link>
              <Link className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/artwork" onClick={() => setIsSidebarOpen(false)}>工作台</Link>
            </nav>
          </SidebarContent>
          <SidebarFooter>
            <div className="w-full px-3 py-2">
              <Button variant="outline" size="sm" className="w-full" data-open-signin>登录 / 注册</Button>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Create Artwork Modal: 入口迁移到 /artwork 页面后默认关闭（仍保留组件以便后续复用） */}
      <CreateArtworkModal 
        isOpen={false}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}