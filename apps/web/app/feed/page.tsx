import { ArtworkGrid } from '@/components/app/ArtworkGrid'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import { ArtworkListItem } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

async function getFeedData(): Promise<ArtworkListItem[]> {
  // 动态运行时直接使用 API 相对路径，交由 authFetch 在服务器端拼接 BASE
  return authFetch(API.feed)
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