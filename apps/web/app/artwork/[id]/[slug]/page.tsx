import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import { ArtworkDetail } from '@/lib/types'
import Image from 'next/image'
import { Button, Card } from '@/components/ui'
import LikeFavoriteBarNew from '@/components/app/LikeFavoriteBarNew'
import { ArtworkActions } from '@/components/app/ArtworkActions'
import { fetchArtworkDetail } from '@/lib/apiAdapter'

async function getArtworkDetail(artworkId: string): Promise<ArtworkDetail> {
  // 使用统一适配器，保证与列表页字段一致（author.profile_pic/name 等）
  return fetchArtworkDetail(API.artwork(artworkId))
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'edge'

export const metadata = {
  title: '赛博朋克猫咪 - AI 艺术作品',
  description: '由小明创作的赛博朋克猫咪 AI 艺术作品',
  openGraph: {
    title: '赛博朋克猫咪 - AI 艺术作品',
    description: '由小明创作的赛博朋克猫咪 AI 艺术作品',
    images: ['https://via.placeholder.com/800x800/3b74ff/ffffff?text=赛博朋克猫咪'],
  },
}

export default async function ArtworkPage({ 
  params 
}: { 
  params: { id: string; slug: string } 
}) {
  const { id } = params
  let artwork: ArtworkDetail | null = null
  try {
    artwork = await getArtworkDetail(id)
  } catch (e) {
    // 友好处理：不抛出 404，返回可见错误状态
      return (
    <div className="page-bg min-h-screen flex items-center justify-center">
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">作品不存在或无访问权限</h1>
        <p className="text-gray-600 mb-6">可能已被删除、未发布或你没有权限查看。</p>
      </div>
    </div>
  )
  }
  // SSR 场景下已无法直接拿到前端 Clerk 的 token，这里保持按钮展示的最小权限：
  // 仅当后端返回的详情中作者与会话匹配才渲染（未来可改为客户端小部件）。
  let isAuthor = false

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 作品图片 */}
          <div className="mb-8">
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={artwork.thumb_url || artwork.url}
                alt={artwork.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {/* 作品信息 */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{artwork.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <span>状态: {artwork.status === 'published' ? '已发布' : '草稿'}</span>
              <span>创建时间: {new Date(artwork.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                {artwork.author.profile_pic ? (
                  <Image
                    src={artwork.author.profile_pic}
                    alt={artwork.author.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <span className="text-gray-600 font-medium">
                    {artwork.author.name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium">{artwork.author.name || '匿名用户'}</p>
                <p className="text-sm text-gray-600">作者</p>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <LikeFavoriteBarNew
                artworkId={artwork.id}
                initialLikeCount={artwork.like_count}
                initialFavoriteCount={artwork.fav_count ?? 0}
                initialIsLiked={!!artwork.user_state.liked}
                initialIsFavorite={!!artwork.user_state.faved}
                size="md"
              />
            </div>
          </Card>
          
          {/* Author Actions: 发布/取消发布/删除 */}
          <ArtworkActions
            artworkId={artwork.id}
            status={artwork.status}
            authorId={artwork.author.id}
          />
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{artwork.like_count}</p>
                <p className="text-sm text-muted-foreground">点赞数</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{artwork.fav_count ?? 0}</p>
                <p className="text-sm text-muted-foreground">收藏数</p>
              </div>
            </Card>
          </div>
          
          {typeof artwork.hot_score === 'number' && (
            <Card className="p-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground">{artwork.hot_score.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">热度值</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}