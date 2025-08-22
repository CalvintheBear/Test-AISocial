import * as React from 'react'
import { Button } from './button'
import Link from 'next/link'
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs'
import { useClerkEnabled } from '@/hooks/useClerkEnabled'
import CreditsBadge from '@/components/CreditsBadge'
import CheckinButton from '@/components/CheckinButton'
import { PlusCircle, Menu, X } from 'lucide-react'

interface HeaderProps {
  className?: string
  onOpenCreateModal?: () => void
  onToggleMobileMenu?: () => void
  showSidebar?: boolean
  mobileMenuOpen?: boolean
}

const Header: React.FC<HeaderProps> = ({ className, onOpenCreateModal, onToggleMobileMenu, showSidebar = true, mobileMenuOpen = false }) => {
  const isClerkEnabled = useClerkEnabled()

  const toggleMobileMenu = () => {
    onToggleMobileMenu?.()
  }

  return (
    <header className={`border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 ${className || ''}`}>
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-4">
          {/* Mobile menu button - only show when sidebar is enabled */}
          {showSidebar && (
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}
          
          <Link href="/" className="flex items-center space-x-2">
            <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 011 1v2a1 1 0 01-1 1h-1v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8H2a1 1 0 01-1-1V5a1 1 0 011-1h4z" />
            </svg>
            <span className="text-xl font-bold">AI社区</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Link href="/feed" className="text-sm font-medium transition-colors hover:text-primary">
            探索
          </Link>
          <Link href="/trending" className="text-sm font-medium transition-colors hover:text-primary">
            热门
          </Link>
          <Link href="/features" className="text-sm font-medium transition-colors hover:text-primary">
            功能
          </Link>
          <Link href="/pricing" className="text-sm font-medium transition-colors hover:text-primary">
            定价
          </Link>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center space-x-2 md:space-x-3">
          {isClerkEnabled ? (
            <>
              <SignedOut>
                <Link href="/artwork" className="hidden sm:block">
                  <Button variant="outline" size="sm" className="border-2 hover:bg-accent/50">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    创作
                  </Button>
                </Link>
                {/* Mobile create button - icon only */}
                <Link href="/artwork" className="sm:hidden">
                  <Button variant="outline" size="sm" className="border-2 hover:bg-accent/50 px-2">
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                </Link>
                <SignInButton mode="modal">
                  <Button variant="default" size="sm" className="text-sm">登录</Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/artwork" className="hidden sm:block">
                  <Button variant="outline" size="sm" className="border-2 hover:bg-accent/50">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    创作
                  </Button>
                </Link>
                {/* Mobile create button - icon only */}
                <Link href="/artwork" className="sm:hidden">
                  <Button variant="outline" size="sm" className="border-2 hover:bg-accent/50 px-2">
                    <PlusCircle className="w-4 h-4" />
                  </Button>
                </Link>
                <div className="hidden sm:flex items-center space-x-2">
                  <CheckinButton />
                  <CreditsBadge />
                </div>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </>
          ) : (
            <>
              <Link href="/artwork" className="hidden sm:block">
                <Button variant="outline" size="sm" className="border-2 hover:bg-accent/50">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  创作
                </Button>
              </Link>
              {/* Mobile create button - icon only */}
              <Link href="/artwork" className="sm:hidden">
                <Button variant="outline" size="sm" className="border-2 hover:bg-accent/50 px-2">
                  <PlusCircle className="w-4 h-4" />
                </Button>
              </Link>
              <Button variant="default" size="sm" data-open-signin className="text-sm">登录</Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

Header.displayName = 'Header'

export { Header }