type StringSet = Set<string>

const memory = {
  likeByArtworkId: new Map<string, number>(),
  favoriteByUserId: new Map<string, StringSet>(),
}

export class RedisService {
  constructor(private url?: string, private token?: string) {}

  static fromEnv(env: any) {
    return new RedisService(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
  }

  private get isConfigured(): boolean {
    return Boolean(this.url && this.token)
  }

  private async execute(command: string, ...args: any[]): Promise<any> {
    if (!this.isConfigured) {
      return null
    }

    try {
      const response = await fetch(`${this.url}/execute`, {
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
      console.warn('Redis command failed, using memory fallback:', error)
      return null
    }
  }

  async incrLikes(artworkId: string, delta: number): Promise<number> {
    const result = await this.execute('INCRBY', `artwork:${artworkId}:likes`, delta)
    if (result !== null) return result

    // Fallback to memory
    const current = memory.likeByArtworkId.get(artworkId) || 0
    const next = Math.max(0, current + delta)
    memory.likeByArtworkId.set(artworkId, next)
    return next
  }

  async getLikes(artworkId: string): Promise<number> {
    const result = await this.execute('GET', `artwork:${artworkId}:likes`)
    if (result !== null) return parseInt(result) || 0

    // Fallback to memory
    return memory.likeByArtworkId.get(artworkId) || 0
  }

  async addFavorite(userId: string, artworkId: string): Promise<void> {
    const result = await this.execute('SADD', `user:${userId}:favorites`, artworkId)
    if (result !== null) return

    // Fallback to memory
    const set = memory.favoriteByUserId.get(userId) || new Set<string>()
    set.add(artworkId)
    memory.favoriteByUserId.set(userId, set)
  }

  async removeFavorite(userId: string, artworkId: string): Promise<void> {
    const result = await this.execute('SREM', `user:${userId}:favorites`, artworkId)
    if (result !== null) return

    // Fallback to memory
    memory.favoriteByUserId.get(userId)?.delete(artworkId)
  }

  async listFavorites(userId: string): Promise<string[]> {
    const result = await this.execute('SMEMBERS', `user:${userId}:favorites`)
    if (result !== null) return result

    // Fallback to memory
    return Array.from(memory.favoriteByUserId.get(userId) || [])
  }

  async isFavorite(userId: string, artworkId: string): Promise<boolean> {
    const result = await this.execute('SISMEMBER', `user:${userId}:favorites`, artworkId)
    if (result !== null) return result === 1

    // Fallback to memory
    return memory.favoriteByUserId.get(userId)?.has(artworkId) || false
  }
}


