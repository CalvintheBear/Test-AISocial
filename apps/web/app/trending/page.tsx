'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Flame, Clock, TrendingUp } from 'lucide-react';
import { useTrendingArtworks } from '@/hooks/useArtworks';
import HotnessFilter from '@/components/HotnessFilter';
import HotnessIndicator, { EmptyState } from '@/components/HotnessIndicator';
import { ArtworkCard } from '@/components/app/ArtworkCard';
import { ArtworkGrid } from '@/components/app/ArtworkGrid';

function TrendingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [timeWindow, setTimeWindow] = useState('24h');
  const [category, setCategory] = useState('all');
  
  const { data: trendingArtworks, isLoading, error } = useTrendingArtworks(timeWindow, category);

  // 从URL参数中恢复筛选状态
  useEffect(() => {
    const urlTimeWindow = searchParams.get('time');
    const urlCategory = searchParams.get('category');
    
    if (urlTimeWindow) setTimeWindow(urlTimeWindow);
    if (urlCategory) setCategory(urlCategory);
  }, [searchParams]);

  // 更新URL参数
  const handleTimeWindowChange = (newTimeWindow: string) => {
    setTimeWindow(newTimeWindow);
    updateUrlParams(newTimeWindow, category);
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    updateUrlParams(timeWindow, newCategory);
  };

  const updateUrlParams = (time: string, cat: string) => {
    const params = new URLSearchParams();
    params.set('time', time);
    params.set('category', cat);
    router.push(`/trending?${params.toString()}`);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Flame className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">加载失败</h2>
          <p className="text-gray-600">无法加载热点内容，请稍后重试</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Flame className="w-8 h-8 text-orange-500" />
            <h1 className="text-4xl font-bold tracking-tight">热点推荐</h1>
          </div>
          <p className="text-muted-foreground text-lg">发现社区中最受欢迎和正在崛起的AI艺术作品</p>
        </div>

        {/* 筛选器 */}
        <div className="mb-8">
          <HotnessFilter
            timeWindow={timeWindow}
            onTimeWindowChange={handleTimeWindowChange}
            category={category}
            onCategoryChange={handleCategoryChange}
          />
        </div>

        {/* 加载状态 */}
        {isLoading && (
          <ArtworkGrid artworks={[]} loading />
        )}

        {/* 空状态 */}
        {!isLoading && (!trendingArtworks || trendingArtworks.length === 0) && (
          <div className="text-center py-16">
            <EmptyState 
              category={category as 'viral' | 'hot' | 'rising' | 'all'} 
              timeWindow={timeWindow} 
            />
            <button
              onClick={() => {
                setTimeWindow('24h');
                setCategory('all');
                router.push('/trending');
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-6"
            >
              <Clock className="w-4 h-4 mr-2" />
              查看24小时内所有作品
            </button>
          </div>
        )}

        {/* 作品列表 */}
        {!isLoading && trendingArtworks && trendingArtworks.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                共找到 {trendingArtworks.length} 个热点作品
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {trendingArtworks.map((artwork) => (
                <div key={artwork.id} className="group">
                  <div className="relative">
                    <ArtworkCard artwork={artwork} />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <HotnessIndicator
                        hotScore={(artwork as any).hot_score ?? artwork.hotness ?? 0}
                        trend={artwork.trend || 'stable'}
                        rank={artwork.rank}
                        showRank={true}
                        size="sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 底部提示 */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full">
            <Clock className="w-4 h-4" />
            <span>热度数据每15分钟更新一次</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Flame className="w-12 h-12 text-orange-500 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <TrendingPageContent />
    </Suspense>
  );
}