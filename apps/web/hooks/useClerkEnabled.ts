'use client'

import { useMemo } from 'react'

export function useClerkEnabled() {
  return useMemo(() => {
    return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  }, [])
}
