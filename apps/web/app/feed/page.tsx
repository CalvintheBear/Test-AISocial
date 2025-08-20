import { ArtworkGrid } from '@/components/app/ArtworkGrid'
import { ArtworkListItem } from '@/lib/types'
import ClientFeedActions from './withActions'

export const revalidate = 60
export const runtime = 'edge'

export const metadata = {
  title: '发现作品 - AI 社区',
  description: '探索社区中令人惊叹的 AI 生成艺术作品，发现创意灵感',
  openGraph: {
    title: '发现作品 - AI 社区',
    description: '探索社区中令人惊叹的 AI 生成艺术作品，发现创意灵感',
  },
}

export default async function FeedPage() {
  // 服务器侧预取公共 Feed（匿名态），首屏直接渲染，客户端再基于登录态二次刷新
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8787'
  let initialArtworks: ArtworkListItem[] = []
  try {
    const res = await fetch(`${API_BASE}/api/feed`, { next: { revalidate: 60 } })
    const json = await res.json().catch(() => null)
    if (json && Array.isArray(json.data)) initialArtworks = json.data
    else if (Array.isArray(json)) initialArtworks = json
  } catch {}

  return <ClientFeedActions initialArtworks={initialArtworks} />
}