'use client'

import { ArtworkListItem } from '@/lib/types'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui'
import { Button } from '@/components/ui'
import Image from 'next/image'
import Link from 'next/link'
import LikeFavoriteBarNew from './LikeFavoriteBarNew'
import { ArtworkHotnessIndicator } from '@/components/HotnessBadge'
import { useRouter, usePathname } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

interface ArtworkCardProps {
  artwork: ArtworkListItem
  onLike?: (artworkId: string) => Promise<void>
  onFavorite?: (artworkId: string) => Promise<void>
  showHotness?: boolean
  locked?: boolean
  onLockedClick?: () => void
}

export function ArtworkCard({ artwork, showHotness, locked, onLockedClick }: ArtworkCardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const href = locked ? '#' : `/artwork/${artwork.id}/${artwork.slug}`
  const handleNavigate = (e: React.MouseEvent) => {
    if (locked) { e.preventDefault(); onLockedClick?.(); return }
    e.preventDefault()
    const from = pathname
    router.push(href)
    setTimeout(() => {
      if (from === pathname) {
        window.location.href = href
      }
    }, 500)
  }

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <Link href={href} onClick={handleNavigate} className="block">
        <div className="relative aspect-square overflow-hidden">
          <Image
            src={artwork.thumb_url}
            alt={artwork.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-300 hover:scale-110"
            quality={85}
            unoptimized={artwork.thumb_url.includes('tempfile.aiquickdraw.com') || artwork.thumb_url.includes('r2.dev')}
          />
          {locked && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center text-white">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-sm font-medium">登录后解锁</p>
              </div>
            </div>
          )}
          {artwork.status === 'draft' && (
            <Badge className="absolute top-3 right-3 bg-yellow-500 hover:bg-yellow-600 text-white">
              草稿
            </Badge>
          )}
          {showHotness && typeof artwork.hot_score === 'number' && artwork.hot_score > 0 && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {artwork.hot_score.toFixed(1)}
              </Badge>
            </div>
          )}
        </div>
      </Link>
      
      <CardHeader className="p-4">
        <div className="flex items-center space-x-3">
          <Link href={locked ? '#' : `/user/${artwork.author.id}`} onClick={e => { if (locked) { e.preventDefault(); onLockedClick?.() } }}>
            <Image
              src={artwork.author.profile_pic || '/images/default-avatar.jpg'}
              alt={artwork.author.name}
              width={32}
              height={32}
              className="rounded-full border-2 border-background"
              unoptimized={(artwork.author.profile_pic || '').includes('via.placeholder.com') || (artwork.author.profile_pic || '').includes('images/default-avatar.jpg')}
            />
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={locked ? '#' : `/user/${artwork.author.id}`} className="text-sm font-medium hover:underline truncate block" onClick={e => { if (locked) { e.preventDefault(); onLockedClick?.() } }}>
              {artwork.author.name}
            </Link>
            <p className="text-xs text-muted-foreground">{new Date(artwork.created_at * 1000).toLocaleDateString()}</p>
          </div>
        </div>
        <Link href={href} onClick={handleNavigate}>
          <h3 className="text-base font-semibold mt-3 line-clamp-2 hover:underline">{artwork.title}</h3>
        </Link>
      </CardHeader>
      
      <CardFooter className="p-4 pt-0">
        <div className="w-full flex items-center justify-between">
          <LikeFavoriteBarNew
            artworkId={artwork.id}
            initialLikeCount={artwork.like_count}
            initialFavoriteCount={artwork.fav_count ?? 0}
            initialIsLiked={!!artwork.user_state.liked}
            initialIsFavorite={!!artwork.user_state.faved}
          />
          {showHotness && typeof artwork.hot_score === 'number' && (
            <div className="flex items-center space-x-1">
              <ArtworkHotnessIndicator hotness={artwork.hot_score} showText={false} />
              <span className="text-xs font-medium text-muted-foreground">{artwork.hot_score.toFixed(1)}</span>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}