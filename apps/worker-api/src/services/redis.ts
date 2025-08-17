// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  FEED: 600,           // 10 minutes
  USER_ARTWORKS: 600,  // 10 minutes
  USER_FAVORITES: 600, // 10 minutes
} as const

type StringSet = Set<string>

const memory = {
  likeByArtworkId: new Map<string, number>(),
  favoriteByUserId: new Map<string, StringSet>(),
}

export class RedisService {
  constructor(private url: string, private token: string) {}

  static fromEnv(env: any) {
    const isDev = env?.DEV_MODE === '1'
    if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
      if (isDev) {
        return new RedisService('', '') // DEV 模式使用内存
      }
      throw new Error('Upstash Redis not configured')
    }
    return new RedisService(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
  }

  private get isDevMode(): boolean {
    return !this.url || !this.token
  }

  async execute(command: string, ...args: any[]): Promise<any> {
    if (this.isDevMode) {
      // DEV模式下直接返回，由调用方处理内存回退
      throw new Error('Redis not configured in DEV mode')
    }

    try {
      // Upstash REST API：对 base URL POST 一个命令数组，例如 ["INCRBY", "key", 1]
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([command, ...args]),
      })

      if (!response.ok) {
        throw new Error(`Upstash API error: ${response.status}`)
      }

      const result = await response.json() as { result: any }
      return result.result
    } catch (error) {
      console.error('Redis command failed:', error)
      throw error
    }
  }

  async incrLikes(artworkId: string, delta: number): Promise<number> {
    if (this.isDevMode) {
      // DEV模式使用内存
      const current = memory.likeByArtworkId.get(artworkId) || 0
      const next = Math.max(0, current + delta)
      memory.likeByArtworkId.set(artworkId, next)
      return next
    }
    const result = await this.execute('INCRBY', `artwork:${artworkId}:likes`, delta)
    return Number(result) || 0
  }

  async getLikes(artworkId: string): Promise<number> {
    if (this.isDevMode) {
      return memory.likeByArtworkId.get(artworkId) || 0
    }
    const result = await this.execute('GET', `artwork:${artworkId}:likes`)
    return Number(result) || 0
  }

  async addFavorite(userId: string, artworkId: string): Promise<void> {
    if (this.isDevMode) {
      const set = memory.favoriteByUserId.get(userId) || new Set<string>()
      set.add(artworkId)
      memory.favoriteByUserId.set(userId, set)
      return
    }
    await this.execute('SADD', `user:${userId}:favorites`, artworkId)
  }

  async removeFavorite(userId: string, artworkId: string): Promise<void> {
    if (this.isDevMode) {
      memory.favoriteByUserId.get(userId)?.delete(artworkId)
      return
    }
    await this.execute('SREM', `user:${userId}:favorites`, artworkId)
  }

  async listFavorites(userId: string): Promise<string[]> {
    if (this.isDevMode) {
      return Array.from(memory.favoriteByUserId.get(userId) || [])
    }
    const result = await this.execute('SMEMBERS', `user:${userId}:favorites`)
    return (result as string[]) || []
  }

  async isFavorite(userId: string, artworkId: string): Promise<boolean> {
    if (this.isDevMode) {
      return memory.favoriteByUserId.get(userId)?.has(artworkId) || false
    }
    const result = await this.execute('SISMEMBER', `user:${userId}:favorites`, artworkId)
    return result === 1
  }

  // Cache methods for feed and user lists with TTL
  async getFeed(limit: number): Promise<string | null> {
    if (this.isDevMode) return null
    return await this.execute('GET', `feed:list:${limit}`)
  }

  async setFeed(limit: number, data: string, ttlSeconds: number = CACHE_TTL.FEED): Promise<void> {
    if (this.isDevMode) return
    await this.execute('SETEX', `feed:list:${limit}`, ttlSeconds, data)
  }

  async invalidateFeed(): Promise<void> {
    if (this.isDevMode) return
    const keys = await this.execute('KEYS', 'feed:list:*')
    if (keys && Array.isArray(keys)) {
      for (const key of keys) {
        await this.execute('DEL', key)
      }
    }
  }

  async getUserArtworks(userId: string): Promise<string | null> {
    if (this.isDevMode) return null
    return await this.execute('GET', `user:${userId}:artworks`)
  }

  async setUserArtworks(userId: string, data: string, ttlSeconds: number = CACHE_TTL.USER_ARTWORKS): Promise<void> {
    if (this.isDevMode) return
    await this.execute('SETEX', `user:${userId}:artworks`, ttlSeconds, data)
  }

  async invalidateUserArtworks(userId: string): Promise<void> {
    if (this.isDevMode) return
    await this.execute('DEL', `user:${userId}:artworks`)
  }

  async getUserFavorites(userId: string): Promise<string | null> {
    if (this.isDevMode) return null
    return await this.execute('GET', `user:${userId}:favorites:list`)
  }

  async setUserFavorites(userId: string, data: string, ttlSeconds: number = CACHE_TTL.USER_FAVORITES): Promise<void> {
    if (this.isDevMode) return
    await this.execute('SETEX', `user:${userId}:favorites:list`, ttlSeconds, data)
  }

  async invalidateUserFavorites(userId: string): Promise<void> {
    if (this.isDevMode) return
    await this.execute('DEL', `user:${userId}:favorites:list`)
  }

  // Cache invalidation helpers
  async invalidateArtworkCache(artworkId: string, userId?: string): Promise<void> {
    if (this.isDevMode) return
    
    // Invalidate feed cache
    await this.invalidateFeed()
    
    // Invalidate user cache if provided
    if (userId) {
      await this.invalidateUserArtworks(userId)
    }
    
    // Invalidate artwork owner cache (for publish operations)
    const artworkOwner = await this.execute('GET', `artwork:${artworkId}:owner`)
    if (artworkOwner) {
      await this.invalidateUserArtworks(artworkOwner as string)
    }
  }

  async invalidateAllUserCaches(userId: string): Promise<void> {
    if (this.isDevMode) return
    await Promise.all([
      this.invalidateUserArtworks(userId),
      this.invalidateUserFavorites(userId),
      this.invalidateFeed()
    ])
  }
}


