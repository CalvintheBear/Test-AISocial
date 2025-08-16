export class CacheService {
  private readonly CACHE_TTL = 600 // 10分钟
  
  constructor(private redis: any) {}

  static fromRedis(redis: any) {
    return new CacheService(redis)
  }

  async getCachedFeed(limit: number): Promise<any[] | null> {
    try {
      const key = `feed:${limit}`
      const cached = await this.redis.execute('GET', key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.warn('Cache miss for feed:', error)
      return null
    }
  }

  async setCachedFeed(limit: number, data: any[]): Promise<void> {
    try {
      const key = `feed:${limit}`
      await this.redis.execute('SETEX', key, this.CACHE_TTL, JSON.stringify(data))
    } catch (error) {
      console.warn('Cache set failed for feed:', error)
    }
  }

  async invalidateFeedCache(): Promise<void> {
    try {
      // 使用通配符删除所有feed相关的缓存
      const pattern = 'feed:*'
      await this.redis.execute('EVAL', `
        local keys = redis.call('KEYS', ARGV[1])
        for i=1,#keys do
          redis.call('DEL', keys[i])
        end
        return #keys
      `, 0, pattern)
    } catch (error) {
      console.warn('Cache invalidation failed:', error)
    }
  }

  async getCachedUserArtworks(userId: string): Promise<any[] | null> {
    try {
      const key = `user:${userId}:artworks`
      const cached = await this.redis.execute('GET', key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.warn('Cache miss for user artworks:', error)
      return null
    }
  }

  async setCachedUserArtworks(userId: string, data: any[]): Promise<void> {
    try {
      const key = `user:${userId}:artworks`
      await this.redis.execute('SETEX', key, this.CACHE_TTL, JSON.stringify(data))
    } catch (error) {
      console.warn('Cache set failed for user artworks:', error)
    }
  }

  async invalidateUserArtworksCache(userId: string): Promise<void> {
    try {
      const key = `user:${userId}:artworks`
      await this.redis.execute('DEL', key)
    } catch (error) {
      console.warn('Cache invalidation failed:', error)
    }
  }
}