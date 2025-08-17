'use client'

import { ArtworkListItem } from '@/lib/types'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui'
import { Button } from '@/components/ui'
import Image from 'next/image'
import Link from 'next/link'
import LikeFavoriteBar from './LikeFavoriteBar'

interface ArtworkCardProps {
  artwork: ArtworkListItem
  onLike?: (artworkId: string) => Promise<void>
  onFavorite?: (artworkId: string) => Promise<void>
}

export function ArtworkCard({ artwork }: ArtworkCardProps) {

  return (
    <Card className="overflow-hidden transition-transform hover:scale-105">
      <Link href={`/artwork/${artwork.id}/${artwork.slug}`}>
        <div className="relative aspect-square">
          <Image
            src={artwork.thumbUrl}
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
        </div>
      </Link>
      
      <CardHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href={`/user/${artwork.author.id}`}>
              <Image
                src={artwork.author.profilePic || '/images/default-avatar.jpg'}
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
        <LikeFavoriteBar
          artworkId={artwork.id}
          initialLikeCount={artwork.likeCount}
          initialFavoriteCount={artwork.favoriteCount ?? 0}
          initialIsLiked={!!artwork.isLiked}
          initialIsFavorite={!!artwork.isFavorite}
        />
        {typeof artwork.hotScore === 'number' && (
          <div className="text-xs text-gray-500">热度 {artwork.hotScore.toFixed(2)}</div>
        )}
      </CardFooter>
    </Card>
  )
}