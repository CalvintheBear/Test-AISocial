import * as React from 'react'
import { cn } from '@/lib/utils'

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen?: boolean
  onClose?: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ 
  className, 
  isOpen = false, 
  onClose, 
  collapsed = false,
  onToggleCollapse,
  children,
  ...props 
}) => {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9998] bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar */}
      <nav
        className={cn(
          'fixed inset-y-0 left-0 z-[9999] bg-surface border-r border-line transform transition-all duration-200 ease-in-out flex flex-col pointer-events-auto',
          collapsed ? 'w-16' : 'w-64',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
        {...props}
      >
        {/* Top: brand + collapse button */}
        <div className="flex items-center justify-between p-3 border-b border-line">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white font-bold shrink-0">A</div>
            <span className={cn('text-base font-semibold text-text transition-all', collapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto')}>AI Social</span>
          </div>
          <button
            aria-label="Toggle collapse"
            onClick={onToggleCollapse}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-line"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h18M3 20h18"/>
              <path d="M8 12h8"/>
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </nav>
    </>
  )
}

interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const SidebarContent: React.FC<SidebarContentProps> = ({ className, children, ...props }) => (
  <div className={cn('flex-1 overflow-y-auto', className)} {...props}>
    {children}
  </div>
)

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({ className, children, ...props }) => (
  <div className={cn('border-b border-line p-4', className)} {...props}>
    {children}
  </div>
)

interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const SidebarFooter: React.FC<SidebarFooterProps> = ({ className, children, ...props }) => (
  <div className={cn('border-t border-line p-4', className)} {...props}>
    {children}
  </div>
)

Sidebar.displayName = 'Sidebar'
SidebarContent.displayName = 'SidebarContent'
SidebarHeader.displayName = 'SidebarHeader'
SidebarFooter.displayName = 'SidebarFooter'

export { Sidebar, SidebarContent, SidebarHeader, SidebarFooter }