'use client'

import { ReactNode, useState } from 'react'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  const router = useRouter()
  const pathname = usePathname()

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  const onNav = (href: string, closeMobile = false) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (closeMobile) setIsSidebarOpen(false)
    const from = pathname
    router.push(href)
    // Fallback: 如果 500ms 内路由未变化，则强制跳转，规避个别页面阻断
    setTimeout(() => {
      if (from === pathname) {
        window.location.href = href
      }
    }, 500)
  }

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
                <Link prefetch={false} className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/" onClick={onNav('/')}>{isSidebarCollapsed ? '🏠' : '首页 / Landing'}</Link>
                <Link prefetch={false} className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/features" onClick={onNav('/features')}>{isSidebarCollapsed ? '📘' : '功能介绍'}</Link>
                <Link prefetch={false} className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/feed" onClick={onNav('/feed')}>{isSidebarCollapsed ? '🖼️' : '推荐 Feed'}</Link>
                <Link prefetch={false} className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/user/me" onClick={onNav('/user/me')}>{isSidebarCollapsed ? '👤' : '我的主页'}</Link>
                <Link prefetch={false} className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/artwork" onClick={onNav('/artwork')}>{isSidebarCollapsed ? '🖌️' : '工作台'}</Link>
              </nav>
            </SidebarContent>
          </Sidebar>
        </aside>

        {/* Mobile Sidebar */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)} collapsed={isSidebarCollapsed}>
          <SidebarHeader className="hidden" />
          <SidebarContent className="p-2">
            <nav className="flex flex-col space-y-1">
              <Link prefetch={false} className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/" onClick={onNav('/', true)}>首页 / Landing</Link>
              <Link prefetch={false} className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/features" onClick={onNav('/features', true)}>功能介绍</Link>
              <Link prefetch={false} className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/feed" onClick={onNav('/feed', true)}>推荐 Feed</Link>
              <Link prefetch={false} className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/user/me" onClick={onNav('/user/me', true)}>我的主页</Link>
              <Link prefetch={false} className="px-3 py-2 rounded-md hover:bg-line text-sm" href="/artwork" onClick={onNav('/artwork', true)}>工作台</Link>
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