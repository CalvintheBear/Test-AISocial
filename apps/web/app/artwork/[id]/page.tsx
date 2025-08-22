import { redirect } from 'next/navigation'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '作品详情 - AI Social',
  description: '查看AI生成的艺术作品详情',
}

export default async function ArtworkRedirectPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const { id } = params
  
  // Redirect to a placeholder page for now
  redirect(`/artwork/${id}/untitled`)
}

export const dynamic = 'force-dynamic'
export const revalidate = 0