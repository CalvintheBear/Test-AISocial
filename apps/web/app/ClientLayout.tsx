'use client'

import { ReactNode, useState } from 'react'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter } from '@/components/ui/sidebar'
import { Header } from '@/components/ui/header'
import { Button } from '@/components/ui/button'
import { CreateArtworkModal } from '@/components/app/CreateArtworkModal'
import { cn } from '@/lib/utils'
import { PageTransition } from '@/components/ui/page-transition'

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

  // 判断是否显示侧边栏（首页和features页面不显示）
  const showSidebar = !['/', '/features'].includes(pathname)

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
    <div className="min-h-screen font-sans antialiased bg-background text-foreground">
      {/* Header */}
      <Header 
        onOpenCreateModal={() => setIsCreateModalOpen(true)} 
        onToggleMobileMenu={toggleSidebar}
        showSidebar={showSidebar}
        mobileMenuOpen={isSidebarOpen}
      />
      
      <div className="flex">
        {/* Sidebar - only show on non-landing pages */}
        {showSidebar && (
          <Sidebar 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)} 
            onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)} 
            collapsed={isSidebarCollapsed}
          >
            <SidebarHeader className="hidden" />
            <SidebarContent className="p-3">
              <nav className="flex flex-col space-y-2">
                <Link 
                  prefetch={false} 
                  className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm transition-colors flex items-center gap-3" 
                  href="/" 
                  onClick={onNav('/', true)}
                >
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-slate-600/10 to-slate-700/10 flex items-center justify-center text-sm">
                    <span className="opacity-80">🏠</span>
                  </div>
                  {!isSidebarCollapsed && <span>首页</span>}
                </Link>
                <Link 
                  prefetch={false} 
                  className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm transition-colors flex items-center gap-3" 
                  href="/features" 
                  onClick={onNav('/features', true)}
                >
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 flex items-center justify-center text-sm">
                    <span className="opacity-80">📘</span>
                  </div>
                  {!isSidebarCollapsed && <span>功能介绍</span>}
                </Link>
                <Link 
                  prefetch={false} 
                  className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm transition-colors flex items-center gap-3" 
                  href="/feed" 
                  onClick={onNav('/feed', true)}
                >
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 flex items-center justify-center text-sm">
                    <span className="opacity-80">🖼️</span>
                  </div>
                  {!isSidebarCollapsed && <span>推荐 Feed</span>}
                </Link>
                <Link 
                  prefetch={false} 
                  className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm transition-colors flex items-center gap-3" 
                  href="/user/me" 
                  onClick={onNav('/user/me', true)}
                >
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-slate-500/10 to-slate-600/10 flex items-center justify-center text-sm">
                    <span className="opacity-80">👤</span>
                  </div>
                  {!isSidebarCollapsed && <span>我的主页</span>}
                </Link>
                <Link 
                  prefetch={false} 
                  className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm transition-colors flex items-center gap-3" 
                  href="/trending" 
                  onClick={onNav('/trending', true)}
                >
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-rose-500/10 to-rose-600/10 flex items-center justify-center text-sm">
                    <span className="opacity-80">🔥</span>
                  </div>
                  {!isSidebarCollapsed && <span>热门</span>}
                </Link>
                <Link 
                  prefetch={false} 
                  className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm transition-colors flex items-center gap-3" 
                  href="/pricing" 
                  onClick={onNav('/pricing', true)}
                >
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500/10 to-amber-600/10 flex items-center justify-center text-sm">
                    <span className="opacity-80">💰</span>
                  </div>
                  {!isSidebarCollapsed && <span>定价</span>}
                </Link>
                <Link 
                  prefetch={false} 
                  className="px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground text-sm transition-colors flex items-center gap-3" 
                  href="/artwork" 
                  onClick={onNav('/artwork', true)}
                >
                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500/10 to-violet-600/10 flex items-center justify-center text-sm">
                    <span className="opacity-80">🖌️</span>
                  </div>
                  {!isSidebarCollapsed && <span>工作台</span>}
                </Link>
              </nav>
            </SidebarContent>
            <SidebarFooter>
              <div className="w-full px-3 py-2">
                <Button variant="outline" size="sm" className="w-full border-2 hover:bg-accent/50" data-open-signin>登录 / 注册</Button>
              </div>
            </SidebarFooter>
          </Sidebar>
        )}
        
        <main className={cn(
          "flex-1 transition-all duration-200 ease-in-out",
          showSidebar && !isSidebarCollapsed && "md:ml-64",
          showSidebar && isSidebarCollapsed && "md:ml-16"
        )}>
          <PageTransition>
            {children}
          </PageTransition>
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