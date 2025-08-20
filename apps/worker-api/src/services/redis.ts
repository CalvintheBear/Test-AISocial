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
  likedByUserId: new Map<string, StringSet>(),
  zsets: new Map<string, Map<string, number>>(),
  hashes: new Map<string, Map<string, string>>(),
  counters: new Map<string, string>(),
  strings: new Map<string, string>(),
}

export class RedisService {
  constructor(private url: string, private token: string) {}

  static fromEnv(env: any) {
    // 若未配置 Upstash，则统一回退到内存实现，避免生产环境 500
    if (!env?.UPSTASH_REDIS_REST_URL || !env?.UPSTASH_REDIS_REST_TOKEN) {
      return new RedisService('', '')
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

  async delLikes(artworkId: string): Promise<void> {
    if (this.isDevMode) {
      memory.likeByArtworkId.delete(artworkId)
      return
    }
    await this.execute('DEL', `artwork:${artworkId}:likes`)
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

  // Per-user likes set (for "我的点赞" 列表与 isLiked 判断)
  async addUserLike(userId: string, artworkId: string): Promise<void> {
    if (this.isDevMode) {
      const set = memory.likedByUserId.get(userId) || new Set<string>()
      set.add(artworkId)
      memory.likedByUserId.set(userId, set)
      return
    }
    await this.execute('SADD', `user:${userId}:likes`, artworkId)
  }

  async removeUserLike(userId: string, artworkId: string): Promise<void> {
    if (this.isDevMode) {
      memory.likedByUserId.get(userId)?.delete(artworkId)
      return
    }
    await this.execute('SREM', `user:${userId}:likes`, artworkId)
  }

  async listUserLikes(userId: string): Promise<string[]> {
    if (this.isDevMode) {
      return Array.from(memory.likedByUserId.get(userId) || [])
    }
    const result = await this.execute('SMEMBERS', `user:${userId}:likes`)
    return (result as string[]) || []
  }

  async isLiked(userId: string, artworkId: string): Promise<boolean> {
    if (this.isDevMode) {
      return memory.likedByUserId.get(userId)?.has(artworkId) || false
    }
    const result = await this.execute('SISMEMBER', `user:${userId}:likes`, artworkId)
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

  async invalidateAllFavoritesLists(): Promise<void> {
    if (this.isDevMode) {
      memory.favoriteByUserId.clear()
      return
    }
    const keys = await this.execute('KEYS', 'user:*:favorites:list')
    if (Array.isArray(keys)) {
      for (const key of keys) {
        await this.execute('DEL', key)
      }
    }
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

  // === 热度计算相关Redis操作 ===

  async zadd(key: string, score: number, member: string): Promise<number> {
    if (this.isDevMode) {
      // DEV模式下使用内存Map模拟有序集合
      if (!memory.zsets) memory.zsets = new Map()
      if (!memory.zsets.get(key)) memory.zsets.set(key, new Map())
      memory.zsets.get(key)!.set(member, score)
      return 1
    }
    const result = await this.execute('ZADD', key, score, member)
    return Number(result) || 0
  }

  async zcard(key: string): Promise<number> {
    if (this.isDevMode) {
      if (!memory.zsets || !memory.zsets.get(key)) return 0
      return memory.zsets.get(key)!.size
    }
    const result = await this.execute('ZCARD', key)
    return Number(result) || 0
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    if (this.isDevMode) {
      if (!memory.zsets || !memory.zsets.get(key)) return []
      const entries = Array.from(memory.zsets.get(key)!.entries())
      entries.sort((a, b) => b[1] - a[1]) // 降序排序
      return entries.slice(start, stop + 1).map(([member]) => member)
    }
    const result = await this.execute('ZREVRANGE', key, start, stop)
    return (result as string[]) || []
  }

  async zrevrank(key: string, member: string): Promise<number | null> {
    if (this.isDevMode) {
      if (!memory.zsets || !memory.zsets.get(key)) return null
      const entries = Array.from(memory.zsets.get(key)!.entries())
      entries.sort((a, b) => b[1] - a[1]) // 降序排序
      const index = entries.findIndex(([m]) => m === member)
      return index === -1 ? null : index
    }
    const result = await this.execute('ZREVRANK', key, member)
    return result === null ? null : Number(result)
  }

  async zscore(key: string, member: string): Promise<number | null> {
    if (this.isDevMode) {
      if (!memory.zsets || !memory.zsets.get(key)) return null
      return memory.zsets.get(key)!.get(member) || null
    }
    const result = await this.execute('ZSCORE', key, member)
    return result === null ? null : Number(result)
  }

  async hset(key: string, field: string, value: string | number): Promise<number> {
    if (this.isDevMode) {
      if (!memory.hashes) memory.hashes = new Map()
      if (!memory.hashes.get(key)) memory.hashes.set(key, new Map())
      memory.hashes.get(key)!.set(field, String(value))
      return 1
    }
    const result = await this.execute('HSET', key, field, value)
    return Number(result) || 0
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (this.isDevMode) {
      if (!memory.hashes || !memory.hashes.get(key)) return null
      return memory.hashes.get(key)!.get(field) || null
    }
    const result = await this.execute('HGET', key, field)
    return result as string | null
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (this.isDevMode) {
      if (!memory.hashes || !memory.hashes.get(key)) return {}
      return Object.fromEntries(memory.hashes.get(key)!.entries())
    }
    const result = await this.execute('HGETALL', key)
    return (result as Record<string, string>) || {}
  }

  async hmset(key: string, ...args: (string | number)[]): Promise<string> {
    if (this.isDevMode) {
      if (!memory.hashes) memory.hashes = new Map()
      if (!memory.hashes.get(key)) memory.hashes.set(key, new Map())
      for (let i = 0; i < args.length; i += 2) {
        memory.hashes.get(key)!.set(String(args[i]), String(args[i + 1]))
      }
      return 'OK'
    }
    const result = await this.execute('HMSET', key, ...args)
    return result as string
  }

  async incr(key: string): Promise<number> {
    if (this.isDevMode) {
      if (!memory.counters) memory.counters = new Map()
      const current = Number(memory.counters.get(key) || 0)
      const next = current + 1
      memory.counters.set(key, String(next))
      return next
    }
    const result = await this.execute('INCR', key)
    return Number(result) || 0
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (this.isDevMode) return true
    const result = await this.execute('EXPIRE', key, seconds)
    return result === 1
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.isDevMode) {
      // DEV模式下返回空数组，避免内存泄露
      return []
    }
    const result = await this.execute('KEYS', pattern)
    return (result as string[]) || []
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<string> {
    if (this.isDevMode) {
      if (!memory.strings) memory.strings = new Map()
      memory.strings.set(key, value)
      return 'OK'
    }
    if (ttlSeconds) {
      return await this.execute('SETEX', key, ttlSeconds, value)
    }
    return await this.execute('SET', key, value)
  }

  async del(key: string): Promise<number> {
    if (this.isDevMode) {
      memory.strings?.delete(key)
      memory.hashes?.delete(key)
      memory.zsets?.delete(key)
      memory.counters?.delete(key)
      return 1
    }
    const result = await this.execute('DEL', key)
    return Number(result) || 0
  }

  async get(key: string): Promise<string | null> {
    if (this.isDevMode) {
      return memory.strings?.get(key) || null
    }
    const result = await this.execute('GET', key)
    return result as string | null
  }

  async publish(channel: string, message: string): Promise<void> {
    if (this.isDevMode) return

    try {
      await this.execute('PUBLISH', channel, message)
    } catch (error) {
      console.error('Error publishing message:', error)
    }
  }
}


