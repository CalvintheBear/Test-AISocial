export type User = { id: string; name: string; profilePic?: string }
export type Artwork = {
  id: string
  slug: string
  title: string
  url: string
  status: 'draft' | 'published'
  author: User
  likeCount: number
  createdAt: number
}

const demoUser: User = { id: 'dev-user', name: '演示用户' }
const memArtworks: Map<string, Artwork> = new Map(
  [
    ['a1', { id: 'a1', slug: 'cyber-cat', title: '赛博朋克猫咪', url: 'https://via.placeholder.com/800x800/3b74ff/ffffff?text=赛博朋克猫咪', status: 'published', author: demoUser, likeCount: 3, createdAt: Date.now() - 86400000 }],
    ['a2', { id: 'a2', slug: 'sunrise', title: '日出', url: 'https://via.placeholder.com/800x800/ff8844/ffffff?text=日出', status: 'draft', author: demoUser, likeCount: 1, createdAt: Date.now() - 43200000 }],
  ]
)

export class D1Service {
  constructor(private db?: D1Database) {}
  static fromEnv(env: any) { return new D1Service(env.DB) }

  async getArtwork(id: string): Promise<Artwork | null> {
    // TODO: 如果配置了 D1，改为 SELECT
    return memArtworks.get(id) || null
  }

  async listFeed(limit = 20): Promise<Artwork[]> {
    // TODO: 如果配置了 D1，改为 SELECT
    return Array.from(memArtworks.values()).filter(a => a.status === 'published').slice(0, limit)
  }

  async listUserArtworks(userId: string): Promise<Artwork[]> {
    return Array.from(memArtworks.values()).filter(a => a.author.id === userId)
  }

  async publishArtwork(id: string): Promise<Artwork | null> {
    const a = memArtworks.get(id)
    if (!a) return null
    a.status = 'published'
    return a
  }
}


