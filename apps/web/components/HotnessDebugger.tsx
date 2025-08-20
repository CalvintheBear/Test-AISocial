'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { API } from '@/lib/api/endpoints'
import { authFetch } from '@/lib/api/client'

interface HotnessDetails {
  artwork: {
    id: string
    title: string
    url: string
    thumb_url: string
    user_name: string
  }
  hotness: {
    score: number
    level: string
    rank: number
    details: {
      base_weight: number
      interaction_weight: number
      time_decay: number
      view_count: number
      comment_count: number
      share_count: number
    }
  }
}

export default function HotnessDebugger() {
  const [artworkId, setArtworkId] = useState('')
  const [inputId, setInputId] = useState('')

  const { data, error, isLoading } = useSWR(
    artworkId ? API.hotness.detail(artworkId) : null,
    (url: string) => authFetch(url)
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setArtworkId(inputId)
  }

  const getHotnessColor = (level: string) => {
    switch (level) {
      case 'hot': return 'text-red-600 bg-red-100'
      case 'warm': return 'text-orange-600 bg-orange-100'
      case 'cool': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">🔍 热度调试工具</h1>
        <p className="text-gray-600 mb-6">查看作品的热度详情和排行榜位置</p>
        
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-4">
            <input
              type="text"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder="输入作品ID"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!inputId || isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '加载中...' : '查询'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-700">错误：{error.message}</div>
        </div>
      )}

      {data && (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          {/* 基本信息 */}
          <div className="flex items-start space-x-4">
            <img
              src={data.artwork.thumb_url}
              alt={data.artwork.title}
              className="w-24 h-24 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-1">{data.artwork.title}</h2>
              <p className="text-gray-600 mb-2">作者：{data.artwork.user_name}</p>
              <p className="text-sm text-gray-500">ID：{data.artwork.id}</p>
            </div>
          </div>

          {/* 热度概览 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-3">热度概览</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-600">总分：</span>
                <span className="font-bold text-lg">{data.hotness.score.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-600">排名：</span>
                <span className="font-bold text-lg">#{data.hotness.rank}</span>
              </div>
              <div>
                <span className="text-gray-600">等级：</span>
                <span className={`font-bold px-2 py-1 rounded text-sm ${getHotnessColor(data.hotness.level)}`}>
                  {data.hotness.level.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* 详细分解 */}
          <div className="space-y-4">
            <h3 className="font-semibold">详细分解</h3>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">基础权重</h4>
              <div className="text-blue-800">{data.hotness.details.base_weight.toFixed(2)}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">互动权重</h4>
              <div className="text-green-800">{data.hotness.details.interaction_weight.toFixed(2)}</div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-2">时间衰减</h4>
              <div className="text-purple-800">{data.hotness.details.time_decay.toFixed(3)}</div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="font-medium text-orange-900 mb-2">互动统计</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>浏览：{data.hotness.details.view_count}</div>
                <div>评论：{data.hotness.details.comment_count}</div>
                <div>分享：{data.hotness.details.share_count}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!data && !isLoading && (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          <p>输入作品ID查看热度详情</p>
        </div>
      )}
    </div>
  )
}