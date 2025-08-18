import React from 'react';
import { Flame, TrendingUp, TrendingDown, Award, Activity, AlertTriangle } from 'lucide-react';

interface HotnessIndicatorProps {
  hotScore: number;
  trend?: 'up' | 'down' | 'stable';
  rank?: number;
  size?: 'sm' | 'md' | 'lg';
  showRank?: boolean;
  className?: string;
}

const HotnessIndicator: React.FC<HotnessIndicatorProps> = ({
  hotScore,
  trend = 'stable',
  rank,
  size = 'md',
  showRank = false,
  className = ''
}) => {
  const getHotnessLevel = (score: number) => {
    if (score > 100) return { level: 'viral', color: 'text-red-500', bgColor: 'bg-red-50', label: '爆红' };
    if (score > 50) return { level: 'hot', color: 'text-orange-500', bgColor: 'bg-orange-50', label: '热门' };
    if (score > 20) return { level: 'rising', color: 'text-yellow-500', bgColor: 'bg-yellow-50', label: '上升' };
    if (score > 10) return { level: 'active', color: 'text-blue-500', bgColor: 'bg-blue-50', label: '活跃' };
    if (score > 5) return { level: 'new', color: 'text-green-500', bgColor: 'bg-green-50', label: '新作品' };
    return { level: 'cold', color: 'text-gray-500', bgColor: 'bg-gray-50', label: '新发布' };
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3" />;
      case 'down':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getIcon = (level: string) => {
    switch (level) {
      case 'viral':
        return <Flame className="w-full h-full" />;
      case 'hot':
        return <Award className="w-full h-full" />;
      case 'rising':
        return <TrendingUp className="w-full h-full" />;
      case 'active':
        return <Activity className="w-full h-full" />;
      default:
        return <AlertTriangle className="w-full h-full" />;
    }
  };

  const { level, color, bgColor, label } = getHotnessLevel(hotScore);
  const trendIcon = getTrendIcon(trend);
  const icon = getIcon(level);

  const sizeClasses = {
    sm: {
      container: 'px-2 py-1',
      icon: 'w-4 h-4',
      text: 'text-xs',
      score: 'text-sm'
    },
    md: {
      container: 'px-3 py-1.5',
      icon: 'w-5 h-5',
      text: 'text-sm',
      score: 'text-base'
    },
    lg: {
      container: 'px-4 py-2',
      icon: 'w-6 h-6',
      text: 'text-base',
      score: 'text-lg'
    }
  };

  const currentSize = sizeClasses[size];

  const formatScore = (score: number) => {
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}k`;
    }
    return Math.round(score).toString();
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-all ${
        currentSize.container
      } ${bgColor} ${color} ${className}`}
    >
      <div className={`flex-shrink-0 ${currentSize.icon}`}>{icon}</div>
      <span className={`${currentSize.score} font-semibold`}>{formatScore(hotScore)}</span>
      {showRank && rank && (
        <span className={`${currentSize.text} opacity-75`}>#{rank}</span>
      )}
      {trendIcon && (
        <div className="flex-shrink-0" title={`趋势: ${trend}`}>{trendIcon}</div>
      )}
      <div className={`hidden sm:inline ${currentSize.text} opacity-75`}>{label}</div>
    </div>
  );
};

export interface EmptyStateProps {
  category: 'viral' | 'hot' | 'rising' | 'all';
  timeWindow?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ category, timeWindow }) => {
  const messages = {
    viral: {
      title: "还没有爆红作品",
      description: "当作品热度超过100时会出现",
      icon: "🔥",
      color: "text-red-500"
    },
    hot: {
      title: "还没有热门作品", 
      description: "当作品热度超过50时会出现",
      icon: "🔥",
      color: "text-orange-500"
    },
    rising: {
      title: "还没有上升作品",
      description: "当作品热度超过20时会出现",
      icon: "📈",
      color: "text-yellow-500"
    },
    all: {
      title: "暂无热点内容",
      description: "当前时间范围内没有热点作品",
      icon: "📊",
      color: "text-gray-500"
    }
  };

  const message = messages[category] || messages.all;

  return (
    <div className="text-center py-12">
      <div className={`text-4xl mb-4 ${message.color}`}>{message.icon}</div>
      <div className={`text-lg font-medium text-gray-900 mb-2`}>{message.title}</div>
      <p className="text-sm text-gray-400">
        {message.description}
        {timeWindow && ` (时间范围: ${timeWindow})`}
      </p>
    </div>
  );
};

export default HotnessIndicator;