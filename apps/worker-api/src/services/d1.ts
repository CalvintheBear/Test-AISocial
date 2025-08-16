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

export class D1Service {
  constructor(private db: D1Database) {}
  static fromEnv(env: any) {
    if (!env.DB) {
      console.warn('D1 database not configured, using mock data for dev')
      // 创建mock服务
      return new D1Service({
        prepare: () => ({ first: async () => null, all: async () => ({ results: [] }), run: async () => ({}) }),
        exec: async () => ({ results: [] })
      } as any)
    }
    return new D1Service(env.DB)
  }

  async getArtwork(id: string): Promise<Artwork | null> {
    const stmt = this.db.prepare(`
      SELECT a.*, u.name as user_name, u.profile_pic
      FROM artworks a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `)
    const result = await stmt.bind(id).all() as any
    const row = (result?.results || [])[0] as any
    
    if (!row) return null
    
    // 使用数据库中的持久化slug，如果没有则生成一个
    const slug = row.slug || this.generateSlug(String(row.title) || 'untitled')
    
    return {
      id: String(row.id),
      slug: slug,
      title: String(row.title || 'Untitled'),
      url: String(row.thumb_url || row.url),
      status: (row.status === 'draft' || row.status === 'published') ? row.status : 'draft',
      author: {
        id: String(row.user_id),
        name: String(row.user_name),
        profilePic: row.profile_pic ? String(row.profile_pic) : undefined
      },
      likeCount: 0, // Will be updated by Redis
      createdAt: Number(row.created_at)
    }
  }

  async listFeed(limit = 20): Promise<Artwork[]> {
    const stmt = this.db.prepare(`
      SELECT a.*, u.name as user_name, u.profile_pic
      FROM artworks a
      JOIN users u ON a.user_id = u.id
      WHERE a.status = 'published'
      ORDER BY a.created_at DESC
      LIMIT ?
    `)
    const rows = await stmt.bind(limit).all() as any
    
    return (rows.results || []).map((row: any) => {
      // 使用数据库中的持久化slug，如果没有则生成一个
      const slug = row.slug || this.generateSlug(String(row.title) || 'untitled')
      
      return {
        id: String(row.id),
        slug: slug,
        title: String(row.title || 'Untitled'),
        url: String(row.thumb_url || row.url),
        status: (row.status === 'draft' || row.status === 'published') ? row.status : 'draft',
        author: {
          id: String(row.user_id),
          name: String(row.user_name),
          profilePic: row.profile_pic ? String(row.profile_pic) : undefined
        },
        likeCount: 0,
        createdAt: Number(row.created_at)
      }
    })
  }

  async listUserArtworks(userId: string): Promise<Artwork[]> {
    const stmt = this.db.prepare(`
      SELECT a.*, u.name as user_name, u.profile_pic
      FROM artworks a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `)
    const rows = await stmt.bind(userId).all() as any
    
    return (rows.results || []).map((row: any) => {
      // 使用数据库中的持久化slug，如果没有则生成一个
      const slug = row.slug || this.generateSlug(String(row.title) || 'untitled')
      
      return {
        id: String(row.id),
        slug: slug,
        title: String(row.title || 'Untitled'),
        url: String(row.thumb_url || row.url),
        status: (row.status === 'draft' || row.status === 'published') ? row.status : 'draft',
        author: {
          id: String(row.user_id),
          name: String(row.user_name),
          profilePic: row.profile_pic ? String(row.profile_pic) : undefined
        },
        likeCount: 0,
        createdAt: Number(row.created_at)
      }
    })
  }

  async publishArtwork(id: string): Promise<Artwork | null> {
    const stmt = this.db.prepare(`
      UPDATE artworks SET status = 'published' WHERE id = ?
    `)
    await stmt.bind(id).run()
    
    return this.getArtwork(id)
  }

  async createArtwork(userId: string, title: string, url: string, thumbUrl?: string): Promise<string> {
    const id = crypto.randomUUID()
    const slug = this.generateSlug(title || 'untitled')
    
    const stmt = this.db.prepare(`
      INSERT INTO artworks (id, user_id, title, url, thumb_url, slug, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)
    `)
    await stmt.bind(id, userId, title, url, thumbUrl || url, slug, Date.now()).run()
    return id
  }

  async addLike(userId: string, artworkId: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO artworks_like (user_id, artwork_id, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT DO NOTHING
    `)
    await stmt.bind(userId, artworkId, Date.now()).run()
  }

  async removeLike(userId: string, artworkId: string): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM artworks_like WHERE user_id = ? AND artwork_id = ?
    `)
    await stmt.bind(userId, artworkId).run()
  }

  async isLikedByUser(userId: string, artworkId: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT 1 FROM artworks_like WHERE user_id = ? AND artwork_id = ?
    `)
    const res = await stmt.bind(userId, artworkId).all() as any
    return (res?.results || []).length > 0
  }

  async addFavorite(userId: string, artworkId: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO artworks_favorite (user_id, artwork_id, created_at)
      VALUES (?, ?, ?)
      ON CONFLICT DO NOTHING
    `)
    await stmt.bind(userId, artworkId, Date.now()).run()
  }

  async removeFavorite(userId: string, artworkId: string): Promise<void> {
    const stmt = this.db.prepare(`
      DELETE FROM artworks_favorite WHERE user_id = ? AND artwork_id = ?
    `)
    await stmt.bind(userId, artworkId).run()
  }

  async isFavoritedByUser(userId: string, artworkId: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      SELECT 1 FROM artworks_favorite WHERE user_id = ? AND artwork_id = ?
    `)
    const res = await stmt.bind(userId, artworkId).all() as any
    return (res?.results || []).length > 0
  }

  async listUserFavorites(userId: string): Promise<string[]> {
    const stmt = this.db.prepare(`
      SELECT artwork_id FROM artworks_favorite WHERE user_id = ?
    `)
    const rows = await stmt.bind(userId).all() as any
    return (rows.results || []).map((row: any) => String(row.artwork_id))
  }

  private generateSlug(title: string): string {
    return title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .trim()
  }

  // 一致性检查相关方法
  async listAllArtworks(): Promise<Array<{id: string}>> {
    const stmt = this.db.prepare(`SELECT id FROM artworks`)
    const rows = await stmt.all() as any
    return (rows.results || []).map((row: any) => ({ id: String(row.id) }))
  }

  async listAllUsers(): Promise<Array<{id: string}>> {
    const stmt = this.db.prepare(`SELECT id FROM users`)
    const rows = await stmt.all() as any
    return (rows.results || []).map((row: any) => ({ id: String(row.id) }))
  }

  async getLikesCount(artworkId: string): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM artworks_like WHERE artwork_id = ?
    `)
    const rows = await stmt.bind(artworkId).all() as any
    return Number((rows.results || [])[0]?.count || 0)
  }

  async getUserFavorites(userId: string): Promise<string[]> {
    return this.listUserFavorites(userId) // 复用现有方法
  }
}


