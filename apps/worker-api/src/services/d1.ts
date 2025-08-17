export type User = { id: string; name: string; profilePic?: string }
export type Artwork = {
  id: string
  slug: string
  title: string
  url: string
  originalUrl?: string
  thumbUrl?: string
  status: 'draft' | 'published'
  author: User
  likeCount: number
  favoriteCount: number
  createdAt: number
  publishedAt?: number
  engagementWeight?: number
}

export class D1Service {
  constructor(private db: D1Database) {}
  static fromEnv(env: any) {
    if (!env.DB) {
      console.warn('D1 database not configured, using mock data for dev')
      // 创建mock服务（兼容 prepare().bind().all()/first()/run() 调用链）
      const mockStmt = {
        bind: (..._args: any[]) => ({
          all: async () => ({ results: [] }),
          first: async () => null,
          run: async () => ({})
        }),
        all: async () => ({ results: [] }),
        first: async () => null,
        run: async () => ({})
      }
      return new D1Service({
        prepare: () => mockStmt,
        exec: async () => ({ results: [] })
      } as any)
    }
    return new D1Service(env.DB)
  }

  async upsertUser(user: { id: string; name?: string | null; email?: string | null; profilePic?: string | null }): Promise<void> {
    // D1 schema requires users.name/email NOT NULL in initial migration; use empty string when missing
    const name = (user.name ?? '').trim()
    const email = (user.email ?? '').trim()
    const profilePic = user.profilePic ?? null
    const now = Date.now()
    const stmt = this.db.prepare(`
      INSERT INTO users (id, name, email, profile_pic, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        email=excluded.email,
        profile_pic=excluded.profile_pic,
        updated_at=excluded.updated_at
    `)
    await stmt.bind(user.id, name, email, profilePic, now, now).run()
  }

  async updateUserPrivacy(userId: string, opts: { hideName?: boolean; hideEmail?: boolean }): Promise<void> {
    const row = await this.db.prepare(`SELECT hide_name, hide_email FROM users WHERE id = ?`).bind(userId).first() as any
    const hideName = typeof opts.hideName === 'boolean' ? (opts.hideName ? 1 : 0) : Number(row?.hide_name || 0)
    const hideEmail = typeof opts.hideEmail === 'boolean' ? (opts.hideEmail ? 1 : 0) : Number(row?.hide_email || 0)
    await this.db.prepare(`UPDATE users SET hide_name = ?, hide_email = ?, updated_at = ? WHERE id = ?`).bind(hideName, hideEmail, Date.now(), userId).run()
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
      originalUrl: String(row.url),
      thumbUrl: String(row.thumb_url || row.url),
      status: (row.status === 'draft' || row.status === 'published') ? row.status : 'draft',
      author: {
        id: String(row.user_id),
        name: String(row.user_name || ''),
        profilePic: row.profile_pic ? String(row.profile_pic) : undefined
      },
      likeCount: Number(row.like_count || 0),
      favoriteCount: Number(row.favorite_count || 0),
      createdAt: Number(row.created_at)
    }
  }

  async listFeed(limit = 20): Promise<Artwork[]> {
    const stmt = this.db.prepare(`
      SELECT a.*, u.name as user_name, u.profile_pic
      FROM artworks a
      JOIN users u ON a.user_id = u.id
      WHERE a.status = 'published'
      ORDER BY COALESCE(a.published_at, a.created_at) DESC
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
          name: String(row.user_name || ''),
          profilePic: row.profile_pic ? String(row.profile_pic) : undefined
        },
        likeCount: Number(row.like_count || 0),
        favoriteCount: Number(row.favorite_count || 0),
        createdAt: Number(row.created_at),
        publishedAt: row.published_at ? Number(row.published_at) : undefined,
        engagementWeight: Number(row.engagement_weight || 0)
      }
    })
  }

  /**
   * 返回最近发布作品的原图与缩略图 URL，用于离线生成缩略图任务
   */
  async listRecentPublishedWithUrls(limit = 50): Promise<Array<{ id: string; originalUrl: string; thumbUrl: string | null }>> {
    const stmt = this.db.prepare(`
      SELECT id, url as original_url, thumb_url
      FROM artworks
      WHERE status = 'published'
      ORDER BY created_at DESC
      LIMIT ?
    `)
    const rows = await stmt.bind(limit).all() as any
    return (rows.results || []).map((row: any) => ({
      id: String(row.id),
      originalUrl: String(row.original_url),
      thumbUrl: row.thumb_url ? String(row.thumb_url) : null,
    }))
  }

  async listUserArtworks(userId: string): Promise<Artwork[]> {
    const stmt = this.db.prepare(`
      SELECT a.*, u.name as user_name, u.profile_pic
      FROM artworks a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?
      ORDER BY COALESCE(a.published_at, a.created_at) DESC
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
        likeCount: Number(row.like_count || 0),
        favoriteCount: Number(row.favorite_count || 0),
        createdAt: Number(row.created_at),
        publishedAt: row.published_at ? Number(row.published_at) : undefined,
        engagementWeight: Number(row.engagement_weight || 0)
      }
    })
  }

  // No per-user likes table anymore; keep a no-op list API for compatibility
  async listUserLikes(_: string): Promise<Artwork[]> { return [] }

  async publishArtwork(id: string): Promise<Artwork | null> {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE artworks SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?
    `)
    await stmt.bind(now, now, id).run()
    
    return this.getArtwork(id)
  }

  async unpublishArtwork(id: string): Promise<void> {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE artworks SET status = 'draft', published_at = NULL, updated_at = ? WHERE id = ?
    `)
    await stmt.bind(now, id).run()
  }

  async deleteArtwork(id: string): Promise<void> {
    // 删除关联点赞与收藏，再删作品
    await this.db.prepare(`DELETE FROM artworks_like WHERE artwork_id = ?`).bind(id).run()
    await this.db.prepare(`DELETE FROM artworks_favorite WHERE artwork_id = ?`).bind(id).run()
    await this.db.prepare(`DELETE FROM artworks WHERE id = ?`).bind(id).run()
  }

  async createArtwork(
    userId: string, 
    title: string, 
    url: string, 
    thumbUrl?: string,
    opts?: { 
      mimeType?: string; 
      width?: number; 
      height?: number; 
      prompt?: string; 
      model?: string; 
      seed?: number;
    }
  ): Promise<string> {
    const id = crypto.randomUUID()
    const slug = this.generateSlug(title || 'untitled')
    const now = Date.now()
    
    const stmt = this.db.prepare(`
      INSERT INTO artworks (
        id, user_id, title, url, thumb_url, slug, status, created_at, updated_at, mime_type, width, height, prompt, model, seed
      ) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    await stmt.bind(
      id, 
      userId, 
      title, 
      url, 
      thumbUrl || url, 
      slug, 
      now, // created_at
      now, // updated_at
      opts?.mimeType || 'image/png', // mime_type
      opts?.width || null, // width
      opts?.height || null, // height
      opts?.prompt || null, // prompt
      opts?.model || null, // model
      opts?.seed || null // seed
    ).run()
    return id
  }

  async incrLikeCount(artworkId: string, delta: number): Promise<number> {
    const stmt = this.db.prepare(`
      UPDATE artworks SET like_count = MAX(0, COALESCE(like_count, 0) + ?) WHERE id = ?
    `)
    await stmt.bind(delta, artworkId).run()
    const row = await this.db.prepare(`SELECT like_count FROM artworks WHERE id = ?`).bind(artworkId).first() as any
    return Number(row?.like_count || 0)
  }

  // Persist per-user like mapping for durability of "我的点赞" list
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

  async incrFavoriteCount(artworkId: string, delta: number): Promise<number> {
    const stmt = this.db.prepare(`
      UPDATE artworks SET favorite_count = MAX(0, COALESCE(favorite_count, 0) + ?) WHERE id = ?
    `)
    await stmt.bind(delta, artworkId).run()
    const row = await this.db.prepare(`SELECT favorite_count FROM artworks WHERE id = ?`).bind(artworkId).first() as any
    return Number(row?.favorite_count || 0)
  }

  async incrEngagement(artworkId: string, delta: number): Promise<number> {
    const stmt = this.db.prepare(`
      UPDATE artworks SET engagement_weight = MAX(0, COALESCE(engagement_weight, 0) + ?) WHERE id = ?
    `)
    await stmt.bind(delta, artworkId).run()
    const row = await this.db.prepare(`SELECT engagement_weight FROM artworks WHERE id = ?`).bind(artworkId).first() as any
    return Number(row?.engagement_weight || 0)
  }

  // Persist per-user favorite mapping for durability of "我的收藏" list
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

  async getUser(userId: string): Promise<{ id: string; name: string; email: string; profilePic?: string; createdAt?: number; updatedAt?: number; hideName?: boolean; hideEmail?: boolean } | null> {
    const stmt = this.db.prepare(`
      SELECT id, name, email, profile_pic, hide_name, hide_email, created_at, updated_at
      FROM users
      WHERE id = ?
    `)
    const result = await stmt.bind(userId).first() as any
    
    if (!result) return null
    
    return {
      id: String(result.id),
      name: Number(result.hide_name || 0) ? '' : String(result.name || ''), 
      email: Number(result.hide_email || 0) ? '' : String(result.email || ''),
      profilePic: result.profile_pic ? String(result.profile_pic) : undefined,
      createdAt: result.created_at ? Number(result.created_at) : undefined,
      updatedAt: result.updated_at ? Number(result.updated_at) : undefined,
      hideName: Number(result.hide_name || 0) === 1,
      hideEmail: Number(result.hide_email || 0) === 1,
    }
  }

  async updateThumbUrl(artworkId: string, thumbUrl: string): Promise<void> {
    const stmt = this.db.prepare(`UPDATE artworks SET thumb_url = ? WHERE id = ?`)
    await stmt.bind(thumbUrl, artworkId).run()
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


