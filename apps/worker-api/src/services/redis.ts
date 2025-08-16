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

  async incrLikes(artworkId: string, delta: number): Promise<number> {
    // DEV: in-memory fallback; 可按需升级为 Upstash REST 请求
    const current = memory.likeByArtworkId.get(artworkId) || 0
    const next = Math.max(0, current + delta)
    memory.likeByArtworkId.set(artworkId, next)
    return next
  }

  async getLikes(artworkId: string): Promise<number> {
    return memory.likeByArtworkId.get(artworkId) || 0
  }

  async addFavorite(userId: string, artworkId: string): Promise<void> {
    const set = memory.favoriteByUserId.get(userId) || new Set<string>()
    set.add(artworkId)
    memory.favoriteByUserId.set(userId, set)
  }

  async removeFavorite(userId: string, artworkId: string): Promise<void> {
    memory.favoriteByUserId.get(userId)?.delete(artworkId)
  }

  async listFavorites(userId: string): Promise<string[]> {
    return Array.from(memory.favoriteByUserId.get(userId) || [])
  }
}


