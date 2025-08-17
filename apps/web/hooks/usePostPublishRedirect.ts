'use client'

import { useRouter } from 'next/navigation'

export function usePostPublishRedirect() {
  const router = useRouter()

  const redirectToFeed = () => {
    router.push('/feed')
    router.refresh()
  }

  return { redirectToFeed }
}