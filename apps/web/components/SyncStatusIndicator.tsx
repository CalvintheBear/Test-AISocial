import React, { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncStatusIndicatorProps {
  isSyncing?: boolean
  lastUpdated?: Date
  onRefresh?: () => void
  className?: string
}

export function SyncStatusIndicator({ 
  isSyncing = false, 
  lastUpdated, 
  onRefresh, 
  className 
}: SyncStatusIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const formatLastUpdated = (date?: Date) => {
    if (!date) return '从未'
    
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}天前`
    if (hours > 0) return `${hours}小时前`
    if (minutes > 0) return `${minutes}分钟前`
    return '刚刚'
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {isSyncing ? (
        <div className="flex items-center space-x-1 text-blue-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">同步中...</span>
        </div>
      ) : (
        <div className="flex items-center space-x-1 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">已同步</span>
        </div>
      )}
      
      {lastUpdated && (
        <div className="relative">
          <button
            className="text-xs text-gray-500 hover:text-gray-700"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={onRefresh}
            disabled={isSyncing}
          >
            最后更新: {formatLastUpdated(lastUpdated)}
          </button>
          
          {showTooltip && (
            <div className="absolute bottom-full mb-2 left-0 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
              点击刷新
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 帮助文档更新工具
export class DocumentationHelper {
  static getHelpContent() {
    return {
      title: "点赞收藏功能使用指南",
      sections: [
        {
          title: "基本操作",
          content: [
            "点击❤️图标可以点赞/取消点赞作品",
            "点击🔖图标可以收藏/取消收藏作品",
            "数字显示当前的点赞/收藏数量"
          ]
        },
        {
          title: "状态同步",
          content: [
            "系统会自动同步您的操作状态",
            "如果状态显示异常，可以尝试手动刷新",
            "状态更新可能需要几秒钟时间"
          ]
        },
        {
          title: "常见问题",
          content: [
            "如果操作失败，请检查网络连接",
            "刷新页面可以强制同步最新状态",
            "联系客服如果遇到持续问题"
          ]
        }
      ]
    }
  }

  static showHelpModal() {
    const helpContent = this.getHelpContent()
    
    // 创建模态框
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 max-w-md mx-4 max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">${helpContent.title}</h2>
          <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        ${helpContent.sections.map(section => `
          <div class="mb-4">
            <h3 class="font-semibold mb-2">${section.title}</h3>
            <ul class="text-sm text-gray-600 space-y-1">
              ${section.content.map(item => `<li>• ${item}</li>`).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    `
    
    document.body.appendChild(modal)
  }
}