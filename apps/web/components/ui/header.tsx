import * as React from 'react'
import { Button } from './button'
import Link from 'next/link'

interface HeaderProps {
  className?: string
  onOpenCreateModal?: () => void
}

const Header: React.FC<HeaderProps> = ({ className, onOpenCreateModal }) => {
  return (
    <header className={`border-b border-line bg-surface sticky top-0 z-40 ${className || ''}`}>
      <div className="container flex h-16 items-center justify-between">
        <div />

        {/* Center placeholder removed per request */}
        <div />

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center space-x-2">
          <Link href="/login">
            <Button variant="outline" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="primary" size="sm">
              Get Started
            </Button>
          </Link>
        </div>

        {/* Generate/Upload -> route to /artwork */}
        <div className="flex items-center space-x-2">
          <Link href="/artwork">
            <Button 
              variant="primary" 
              size="sm" 
              className="hidden md:block"
            >
              生成/上传
            </Button>
          </Link>
          <Link href="/artwork" className="md:hidden">
            <Button 
              variant="primary" 
              size="sm"
            >
              +
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}

Header.displayName = 'Header'

export { Header }