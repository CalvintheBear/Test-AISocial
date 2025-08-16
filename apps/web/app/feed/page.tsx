import { ArtworkGrid } from '@/components/app/ArtworkGrid'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import { ArtworkListItem } from '@/lib/types'

async function getFeedData(): Promise<ArtworkListItem[]> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return authFetch(new URL('/mocks/feed.json', base).toString())
}

export const metadata = {
  title: '发现作品 - AI 社区',
  description: '探索社区中令人惊叹的 AI 生成艺术作品，发现创意灵感',
  openGraph: {
    title: '发现作品 - AI 社区',
    description: '探索社区中令人惊叹的 AI 生成艺术作品，发现创意灵感',
  },
}

export default async function FeedPage() {
  const artworks = await getFeedData()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">发现作品</h1>
        <p className="text-gray-600">探索社区中令人惊叹的 AI 生成艺术作品，发现创意灵感</p>
      </div>
      
      <ArtworkGrid artworks={artworks} />
    </div>
  )
}