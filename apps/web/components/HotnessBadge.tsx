import { ArtworkListItem } from '@/lib/types'

interface HotnessBadgeProps {
  score: number
  level?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function HotnessBadge({ score, level, showIcon = true, size = 'md' }: HotnessBadgeProps) {
  const getHotnessLevel = (score: number): { level: string; color: string; icon: string } => {
    if (score >= 50) return { level: '火爆', color: 'text-white bg-gradient-to-r from-orange-400 to-red-500 shadow-lg', icon: '🔥' }
    if (score >= 20) return { level: '热门', color: 'text-white bg-gradient-to-r from-yellow-400 to-orange-500 shadow-md', icon: '🔥' }
    if (score >= 10) return { level: '温暖', color: 'text-white bg-gradient-to-r from-emerald-400 to-teal-500 shadow-md', icon: '⭐' }
    if (score >= 5) return { level: '活跃', color: 'text-white bg-gradient-to-r from-cyan-400 to-blue-500 shadow-sm', icon: '✨' }
    return { level: '普通', color: 'text-gray-600 bg-gray-100 border border-gray-200', icon: '💧' }
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
  const score = artwork.hot_score
  if (typeof score !== 'number') return null

  return (
    <div className="absolute top-2 right-2">
      <HotnessBadge score={score} size="sm" />
    </div>
  )
}