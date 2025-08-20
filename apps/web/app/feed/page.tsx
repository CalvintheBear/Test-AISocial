import { ArtworkGrid } from '@/components/app/ArtworkGrid'
// import { authFetch } from '@/lib/api/client'
// import { API } from '@/lib/api/endpoints'
import { ArtworkListItem } from '@/lib/types'
import ClientFeedActions from './withActions'
// import { adaptArtworkList } from '@/lib/apiAdapter'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'edge'

// 移除 SSR 预取，改为客户端加载，避免首屏等待 Clerk token 阻塞导航

export const metadata = {
  title: '发现作品 - AI 社区',
  description: '探索社区中令人惊叹的 AI 生成艺术作品，发现创意灵感',
  openGraph: {
    title: '发现作品 - AI 社区',
    description: '探索社区中令人惊叹的 AI 生成艺术作品，发现创意灵感',
  },
}

export default function FeedPage() {
  // 交由客户端 SWR 获取数据
  return <ClientFeedActions initialArtworks={undefined as unknown as ArtworkListItem[]} />
}