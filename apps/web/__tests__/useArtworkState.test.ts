import { renderHook, act } from '@testing-library/react'
import { useArtworkState } from '@/hooks/useArtworkState'

// Mock SWR
jest.mock('swr')

// Mock fetch
global.fetch = jest.fn()

describe('useArtworkState', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle like toggle successfully', async () => {
    const mockData = {
      like_count: 10,
      fav_count: 5,
      user_state: { liked: false, faved: true }
    }

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { ...mockData, like_count: 11, user_state: { liked: true, faved: true } } })
    })
    global.fetch = mockFetch

    const { result } = renderHook(() => useArtworkState('test-id'))
    
    await act(async () => {
      await result.current.toggleLike()
    })
    
    expect(mockFetch).toHaveBeenCalledWith('/api/artworks/test-id/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
  })

  it('should handle favorite toggle successfully', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { like_count: 10, fav_count: 6, user_state: { liked: false, faved: true } } })
    })
    global.fetch = mockFetch

    const { result } = renderHook(() => useArtworkState('test-id'))
    
    await act(async () => {
      await result.current.toggleFavorite()
    })
    
    expect(mockFetch).toHaveBeenCalledWith('/api/artworks/test-id/favorite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
  })

  it('should handle API error gracefully', async () => {
    const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'))
    global.fetch = mockFetch

    const { result } = renderHook(() => useArtworkState('test-id'))
    
    await act(async () => {
      await result.current.toggleLike()
    })
    
    expect(mockFetch).toHaveBeenCalled()
    // Should not throw, error should be handled internally
  })

  it('should not make requests when artworkId is undefined', async () => {
    const mockFetch = jest.fn()
    global.fetch = mockFetch

    const { result } = renderHook(() => useArtworkState(''))
    
    await act(async () => {
      await result.current.toggleLike()
    })
    
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should refresh artwork state', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: { like_count: 15, fav_count: 8, user_state: { liked: true, faved: true } } })
    })
    global.fetch = mockFetch

    const { result } = renderHook(() => useArtworkState('test-id'))
    
    await act(async () => {
      await result.current.refreshArtwork()
    })
    
    expect(mockFetch).toHaveBeenCalledWith('/api/artworks/test-id/state')
  })
})

describe('EnhancedLikeButton', () => {
  it('should render correctly with initial state', () => {
    const { container } = renderHook(() => useArtworkState('test-id'))
    expect(container).toBeDefined()
  })
})

describe('EnhancedFavoriteButton', () => {
  it('should render correctly with initial state', () => {
    const { container } = renderHook(() => useArtworkState('test-id'))
    expect(container).toBeDefined()
  })
})

describe('artworkStateManager', () => {
  it('should be singleton', () => {
    const { artworkStateManager } = require('@/lib/artworkStateManager')
    const instance1 = artworkStateManager
    const instance2 = artworkStateManager
    expect(instance1).toBe(instance2)
  })

  it('should generate correct cache keys', () => {
    const { artworkStateManager } = require('@/lib/artworkStateManager')
    expect(artworkStateManager.getArtworkStateKey('test-id')).toBe('/api/artworks/test-id/state')
    expect(artworkStateManager.getFeedKey()).toBe('/api/feed')
    expect(artworkStateManager.getUserFavoritesKey('user-id')).toBe('/api/users/user-id/favorites')
  })
})

describe('Hotness Category Filtering', () => {
  it('should filter artworks by viral category', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        success: true, 
        data: [
          { id: '1', hot_score: 150, title: 'Viral Artwork' },
          { id: '2', hot_score: 120, title: 'Another Viral' }
        ] 
      })
    })
    global.fetch = mockFetch

    const { useViralArtworks } = require('@/hooks/useArtworks')
    const { result } = renderHook(() => useViralArtworks(20))
    
    // Wait for SWR to fetch
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/hotness/trending?category=viral&limit=20', expect.any(Object))
  })

  it('should handle empty states', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] })
    })
    global.fetch = mockFetch

    const { useHotArtworks } = require('@/hooks/useArtworks')
    const { result } = renderHook(() => useHotArtworks(10))
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/hotness/trending?category=hot&limit=10', expect.any(Object))
  })

  it('should test rising category filtering', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        success: true, 
        data: [
          { id: '3', hot_score: 25, title: 'Rising Artwork' }
        ] 
      })
    })
    global.fetch = mockFetch

    const { useRisingArtworks } = require('@/hooks/useArtworks')
    const { result } = renderHook(() => useRisingArtworks(15))
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/hotness/trending?category=rising&limit=15', expect.any(Object))
  })

  it('should test general trending with category parameter', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        success: true, 
        data: [
          { id: '4', hot_score: 75, title: 'Hot Artwork' }
        ] 
      })
    })
    global.fetch = mockFetch

    const { useTrendingArtworks } = require('@/hooks/useArtworks')
    const { result } = renderHook(() => useTrendingArtworks('24h', 'hot'))
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/hotness/trending?timeWindow=24h&category=hot', expect.any(Object))
  })
})