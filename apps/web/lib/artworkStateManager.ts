import { mutate } from 'swr'

class ArtworkStateManager {
  private static instance: ArtworkStateManager
  
  static getInstance(): ArtworkStateManager {
    if (!ArtworkStateManager.instance) {
      ArtworkStateManager.instance = new ArtworkStateManager()
    }
    return ArtworkStateManager.instance
  }

  // 更新单个作品状态
  async updateArtworkState(artworkId: string, newState: any) {
    mutate(`/api/artworks/${artworkId}/state`, newState, false)
    mutate(`/api/artworks/${artworkId}`, newState, false)
  }

  // 批量更新作品状态
  async batchUpdateArtworkStates(updates: Array<{ artworkId: string, state: any }>) {
    updates.forEach(({ artworkId, state }) => {
      this.updateArtworkState(artworkId, state)
    })
  }

  // 刷新所有相关缓存
  async refreshAll() {
    mutate('/api/feed')
    mutate((key) => typeof key === 'string' && key.startsWith('/api/artworks/'))
    mutate((key) => typeof key === 'string' && key.includes('/favorites'))
  }

  // 刷新feed
  async refreshFeed() {
    mutate('/api/feed', undefined, { revalidate: true })
    mutate('feed', undefined, { revalidate: true })
  }

  // 刷新用户收藏
  async refreshUserFavorites() {
    mutate((key) => typeof key === 'string' && key.includes('/favorites'), undefined, { revalidate: true })
  }

  // 获取缓存键
  getArtworkStateKey(artworkId: string) {
    return `/api/artworks/${artworkId}/state`
  }

  getFeedKey() {
    return '/api/feed'
  }

  getUserFavoritesKey(userId: string) {
    return `/api/users/${userId}/favorites`
  }

  // 获取批处理状态
  async getBatchArtworkStates(artworkIds: string[]) {
    if (artworkIds.length === 0) return {}
    
    try {
      const response = await fetch('/api/artworks/batch/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkIds })
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch batch states')
      }
      
      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to get batch artwork states:', error)
      return {}
    }
  }

  // 预加载作品状态
  async preloadArtworkStates(artworkIds: string[]) {
    const states = await this.getBatchArtworkStates(artworkIds)
    
    Object.entries(states).forEach(([artworkId, state]) => {
      mutate(`/api/artworks/${artworkId}/state`, state, false)
    })
  }

  // 预加载可见作品状态
  async preloadVisibleArtworks(artworkIds: string[]) {
    try {
      const response = await fetch('/api/artworks/batch/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkIds })
      })
      const result = await response.json()
      
      if (result.success) {
        Object.entries(result.data).forEach(([artworkId, state]) => {
          mutate(`/api/artworks/${artworkId}/state`, state, false)
        })
      }
    } catch (error) {
      console.error('预加载失败:', error)
    }
  }

  // 智能刷新策略
  async refreshWithDelay(type: 'feed' | 'user' | 'artwork', delay = 500) {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        switch (type) {
          case 'feed':
            this.refreshFeed()
            break
          case 'user':
            this.refreshUserFavorites()
            break
          case 'artwork':
            this.refreshAll()
            break
        }
      }, delay)
    } else {
      // 服务器端直接执行
      switch (type) {
        case 'feed':
          await this.refreshFeed()
          break
        case 'user':
          await this.refreshUserFavorites()
          break
        case 'artwork':
          await this.refreshAll()
          break
      }
    }
  }
}

export const artworkStateManager = ArtworkStateManager.getInstance()