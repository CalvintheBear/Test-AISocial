import * as React from 'react'
import { Button } from './button'
import Link from 'next/link'
import { SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs'
import { useClerkEnabled } from '@/hooks/useClerkEnabled'
import CreditsBadge from '@/components/CreditsBadge'
import CheckinButton from '@/components/CheckinButton'

interface HeaderProps {
  className?: string
  onOpenCreateModal?: () => void
}

const Header: React.FC<HeaderProps> = ({ className, onOpenCreateModal }) => {
  const isClerkEnabled = useClerkEnabled()

  return (
    <header className={`border-b border-line bg-surface sticky top-0 z-40 ${className || ''}`}>
      <div className="container flex h-16 items-center justify-between">
        <div />

        {/* Center placeholder removed per request */}
        <div />

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center space-x-3">
          <CheckinButton />
          <CreditsBadge />
          {isClerkEnabled ? (
            <>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="primary" size="sm">登录 / 注册</Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton afterSignOutUrl="/" />
              </SignedIn>
            </>
          ) : (
            <Button variant="primary" size="sm" data-open-signin>登录 / 注册</Button>
          )}
        </div>

        {/* Generate/Upload -> route to /artwork */}

      </div>
    </header>
  )
}

Header.displayName = 'Header'

export { Header }