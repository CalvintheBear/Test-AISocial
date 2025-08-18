'use client'

import { ArtworkListItem } from '@/lib/types'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui'
import { Button } from '@/components/ui'
import Image from 'next/image'
import Link from 'next/link'
import LikeFavoriteBarNew from './LikeFavoriteBarNew'
import { ArtworkHotnessIndicator } from '@/components/HotnessBadge'

interface ArtworkCardProps {
  artwork: ArtworkListItem
  onLike?: (artworkId: string) => Promise<void>
  onFavorite?: (artworkId: string) => Promise<void>
  showHotness?: boolean
}

export function ArtworkCard({ artwork, showHotness }: ArtworkCardProps) {

  return (
    <Card className="overflow-hidden transition-transform hover:scale-105">
      <Link href={`/artwork/${artwork.id}/${artwork.slug}`}>
        <div className="relative aspect-square">
          <Image
            src={artwork.thumb_url}
            alt={artwork.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            quality={85}
          />
          {artwork.status === 'draft' && (
            <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold">
              草稿
            </div>
          )}
          {showHotness && typeof artwork.hot_score === 'number' && artwork.hot_score > 0 && (
            <div className="absolute top-2 left-2">
              <div className="flex items-center space-x-1 bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs font-medium">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>{artwork.hot_score.toFixed(1)}</span>
              </div>
            </div>
          )}
        </div>
      </Link>
      
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href={`/user/${artwork.author.id}`}>
              <Image
                src={artwork.author.profile_pic || '/images/default-avatar.jpg'}
                alt={artwork.author.name}
                width={24}
                height={24}
                className="rounded-full"
              />
            </Link>
            <Link href={`/user/${artwork.author.id}`} className="text-sm font-medium hover:underline">
              {artwork.author.name}
            </Link>
          </div>
        </div>
        <Link href={`/artwork/${artwork.id}/${artwork.slug}`}>
          <h3 className="text-lg font-semibold mt-2 hover:underline">{artwork.title}</h3>
        </Link>
      </CardHeader>
      
      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <LikeFavoriteBarNew
          artworkId={artwork.id}
          initialLikeCount={artwork.like_count}
          initialFavoriteCount={artwork.fav_count ?? 0}
          initialIsLiked={!!artwork.user_state.liked}
          initialIsFavorite={!!artwork.user_state.faved}
        />
        {showHotness && typeof artwork.hot_score === 'number' && (
          <div className="flex items-center space-x-1 text-xs text-orange-600 font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span>{artwork.hot_score.toFixed(1)}</span>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}