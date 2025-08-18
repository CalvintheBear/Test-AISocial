import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import { ArtworkDetail } from '@/lib/types'
import Image from 'next/image'
import { Button, Card } from '@/components/ui'
import LikeFavoriteBarNew from '@/components/app/LikeFavoriteBarNew'
import { ArtworkActions } from '@/components/app/ArtworkActions'

async function getArtworkDetail(artworkId: string): Promise<ArtworkDetail> {
  return authFetch(API.artwork(artworkId))
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
  const artwork = await getArtworkDetail(id)
  // SSR 场景下已无法直接拿到前端 Clerk 的 token，这里保持按钮展示的最小权限：
  // 仅当后端返回的详情中作者与会话匹配才渲染（未来可改为客户端小部件）。
  let isAuthor = false

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Artwork Image */}
        <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={artwork.thumb_url || artwork.url}
            alt={artwork.title}
            fill
            className="object-contain"
            quality={95}
            priority
          />
        </div>

        {/* Artwork Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{artwork.title}</h1>
            
            {/* Author Info */}
            <div className="flex items-center space-x-3 mb-4">
              <Image
                src={artwork.author.profile_pic || 'https://via.placeholder.com/40x40/cccccc/666666?text=用户'}
                alt={artwork.author.name}
                width={40}
                height={40}
                className="rounded-full"
              />
              <div>
                <p className="font-semibold">{artwork.author.name}</p>
                <p className="text-sm text-gray-600">
                  创建于 {new Date(artwork.created_at).toLocaleDateString('zh-CN')}
                </p>
              </div>
            </div>

            {artwork.status === 'draft' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-yellow-800 font-medium">草稿状态</p>
                <p className="text-yellow-700 text-sm">此作品仍为草稿，其他用户无法查看。</p>
              </div>
            )}
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
            initialLikeCount={artwork.like_count}
            initialIsFavorite={!!artwork.user_state.faved}
            status={artwork.status}
            authorId={artwork.author.id}
          />
          {/* 热度与收藏计数 */}
          <Card className="p-4">
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div>收藏数：{artwork.fav_count ?? 0}</div>
              {typeof artwork.hot_score === 'number' && (
                <div>热度：{artwork.hot_score.toFixed(2)}</div>
              )}
            </div>
          </Card>

          {/* Stats */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{artwork.like_count}</p>
                <p className="text-sm text-gray-600">点赞数</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{artwork.fav_count ?? 0}</p>
                <p className="text-sm text-gray-600">收藏数</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}