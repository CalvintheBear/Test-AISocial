import { ArtworkListItem } from '@/lib/types'

interface HotnessBadgeProps {
  score: number
  level?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function HotnessBadge({ score, level, showIcon = true, size = 'md' }: HotnessBadgeProps) {
  const getHotnessLevel = (score: number): { level: string; color: string; icon: string } => {
    if (score >= 50) return { level: '热门', color: 'text-red-600 bg-red-100', icon: '🔥' }
    if (score >= 20) return { level: '热门', color: 'text-orange-600 bg-orange-100', icon: '🔥' }
    if (score >= 10) return { level: '温暖', color: 'text-yellow-600 bg-yellow-100', icon: '⭐' }
    if (score >= 5) return { level: '活跃', color: 'text-blue-600 bg-blue-100', icon: '✨' }
    return { level: '普通', color: 'text-gray-600 bg-gray-100', icon: '❄️' }
  }

  const hotness = getHotnessLevel(score)
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  return (
    <div className={`inline-flex items-center space-x-1 rounded-full ${hotness.color} ${sizeClasses[size]}`}>
      {showIcon && <span>{hotness.icon}</span>}
      <span className="font-medium">{hotness.level}</span>
      <span className="opacity-75">{score.toFixed(1)}</span>
    </div>
  )
}

interface ArtworkHotnessIndicatorProps {
  artwork: ArtworkListItem
}

export function ArtworkHotnessIndicator({ artwork }: ArtworkHotnessIndicatorProps) {
  const score = artwork.hotScore
  if (typeof score !== 'number') return null

  return (
    <div className="absolute top-2 right-2">
      <HotnessBadge score={score} size="sm" />
    </div>
  )
}