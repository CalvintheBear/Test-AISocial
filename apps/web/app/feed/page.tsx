import { ArtworkGrid } from '@/components/app/ArtworkGrid'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import { ArtworkListItem } from '@/lib/types'
import ClientFeedActions from './withActions'
import { adaptArtworkList } from '@/lib/apiAdapter'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'edge'

async function getFeedData(): Promise<ArtworkListItem[]> {
  // 使用API适配器确保URL字段正确映射
  const response = await authFetch(API.feed)
  return adaptArtworkList(response)
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
    <ClientFeedActions initialArtworks={artworks} />
  )
}