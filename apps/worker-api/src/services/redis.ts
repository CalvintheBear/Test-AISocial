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

  private async execute(command: string, ...args: any[]): Promise<any> {
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
}


