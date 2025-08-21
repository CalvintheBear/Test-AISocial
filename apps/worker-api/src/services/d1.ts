export type User = { id: string; name: string; profilePic?: string }
export type Artwork = {
  id: string
  slug: string
  title: string
  url: string
  originalUrl?: string
  thumbUrl?: string
  status: 'draft' | 'published' | 'generating'
  author: User
  likeCount: number
  favoriteCount: number
  createdAt: number
  publishedAt?: number
  engagementWeight?: number
  kieData?: {
    kie_prompt?: string
    kie_model?: string
    kie_aspect_ratio?: string
    kie_output_format?: string
  }
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
    // 仅在提供了非空值时才更新字段，避免用空值覆盖已保存的资料
    const name = (user.name ?? '').trim()
    const email = (user.email ?? '').trim()
    const profilePic = (user.profilePic ?? '').trim()
    const now = Date.now()
    const stmt = this.db.prepare(`
      INSERT INTO users (id, name, email, profile_pic, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = CASE WHEN length(excluded.name) > 0 THEN excluded.name ELSE users.name END,
        email = CASE WHEN length(excluded.email) > 0 THEN excluded.email ELSE users.email END,
        profile_pic = CASE WHEN length(excluded.profile_pic) > 0 THEN excluded.profile_pic ELSE users.profile_pic END,
        updated_at = excluded.updated_at
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
      SELECT a.*, CASE WHEN COALESCE(u.hide_name,0)=1 THEN '' ELSE u.name END as user_name, u.profile_pic
      FROM artworks a
      LEFT JOIN users u ON a.user_id = u.id
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
      status: row.status || 'draft',
      author: {
        id: String(row.user_id),
        name: String(row.user_name || ''),
        profilePic: row.profile_pic ? String(row.profile_pic) : undefined
      },
      likeCount: Number(row.like_count || 0),
      favoriteCount: Number(row.favorite_count || 0),
      createdAt: Number(row.created_at),
      kieData: {
        kie_prompt: row.kie_prompt ? String(row.kie_prompt) : undefined,
        kie_model: row.kie_model ? String(row.kie_model) : undefined,
        kie_aspect_ratio: row.kie_aspect_ratio ? String(row.kie_aspect_ratio) : undefined,
        kie_output_format: row.kie_output_format ? String(row.kie_output_format) : undefined,
      }
    }
  }

  async listFeed(limit = 20): Promise<Artwork[]> {
    const stmt = this.db.prepare(`
      SELECT a.*, CASE WHEN COALESCE(u.hide_name,0)=1 THEN '' ELSE u.name END as user_name, u.profile_pic
      FROM artworks a
      LEFT JOIN users u ON a.user_id = u.id
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
        status: row.status || 'draft',
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
   * 使用 LEFT JOIN 在一次查询中返回 Feed 列表以及当前用户的关系位
   */
  async listFeedWithUserState(userId: string, limit = 20): Promise<{ artworks: Artwork[]; userStates: Array<{ liked: boolean; faved: boolean }> }> {
    const stmt = this.db.prepare(`
      SELECT 
        a.*, 
        CASE WHEN COALESCE(u.hide_name,0)=1 THEN '' ELSE u.name END as user_name, 
        u.profile_pic,
        CASE WHEN al.user_id IS NULL THEN 0 ELSE 1 END AS isLiked,
        CASE WHEN af.user_id IS NULL THEN 0 ELSE 1 END AS isFavorited
      FROM artworks a
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN artworks_like al ON al.artwork_id = a.id AND al.user_id = ?
      LEFT JOIN artworks_favorite af ON af.artwork_id = a.id AND af.user_id = ?
      WHERE a.status = 'published'
      ORDER BY COALESCE(a.published_at, a.created_at) DESC
      LIMIT ?
    `)
    const rows = await stmt.bind(userId, userId, limit).all() as any

    const artworks: Artwork[] = []
    const userStates: Array<{ liked: boolean; faved: boolean }> = []

    for (const row of (rows.results || [])) {
      const slug = row.slug || this.generateSlug(String(row.title) || 'untitled')
      artworks.push({
        id: String(row.id),
        slug,
        title: String(row.title || 'Untitled'),
        url: String(row.thumb_url || row.url),
        status: row.status || 'draft',
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
      })
      userStates.push({
        liked: Number(row.isLiked || 0) === 1,
        faved: Number(row.isFavorited || 0) === 1,
      })
    }

    return { artworks, userStates }
  }

  /**
   * 批量获取指定ID的作品（含作者信息），用于 Favorites/Likes 列表，避免 N 次 getArtwork
   */
  async getArtworksByIds(ids: string[]): Promise<Artwork[]> {
    if (!ids || ids.length === 0) return []
    const placeholders = ids.map(() => '?').join(',')
    const stmt = this.db.prepare(`
      SELECT a.*, CASE WHEN COALESCE(u.hide_name,0)=1 THEN '' ELSE u.name END as user_name, u.profile_pic
      FROM artworks a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id IN (${placeholders})
    `)
    const rows = await stmt.bind(...ids).all() as any
    return (rows.results || []).map((row: any) => {
      const slug = row.slug || this.generateSlug(String(row.title) || 'untitled')
      return {
        id: String(row.id),
        slug,
        title: String(row.title || 'Untitled'),
        url: String(row.thumb_url || row.url),
        status: row.status || 'draft',
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
      SELECT a.*, CASE WHEN COALESCE(u.hide_name,0)=1 THEN '' ELSE u.name END as user_name, u.profile_pic
      FROM artworks a
      LEFT JOIN users u ON a.user_id = u.id
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
        status: row.status || 'draft',
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

  async getLikesCount(artworkId: string): Promise<number> {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM artworks_like WHERE artwork_id = ?`)
    const rows = await stmt.bind(artworkId).all() as any
    return Number((rows.results || [])[0]?.count || 0)
  }

  async getFavoritesCount(artworkId: string): Promise<number> {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM artworks_favorite WHERE artwork_id = ?`)
    const rows = await stmt.bind(artworkId).all() as any
    return Number((rows.results || [])[0]?.count || 0)
  }

  async syncArtworkCounts(artworkId: string): Promise<{ likeCount: number; favoriteCount: number }> {
    const actualLikes = await this.getLikesCount(artworkId)
    const actualFavorites = await this.getFavoritesCount(artworkId)
    
    await this.db.prepare(`
      UPDATE artworks 
      SET like_count = ?, favorite_count = ? 
      WHERE id = ?
    `).bind(actualLikes, actualFavorites, artworkId).run()
    
    return { likeCount: actualLikes, favoriteCount: actualFavorites }
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

  async getUserFavorites(userId: string): Promise<string[]> {
    return this.listUserFavorites(userId) // 复用现有方法
  }

  // 新增方法用于支持状态端点
  async getLikeCount(artworkId: string): Promise<number> {
    return this.getLikesCount(artworkId)
  }

  async getFavoriteCount(artworkId: string): Promise<number> {
    return this.getFavoritesCount(artworkId)
  }

  async getUserArtworkState(userId: string, artworkId: string): Promise<{ liked: boolean; faved: boolean }> {
    const [liked, faved] = await Promise.all([
      this.isLikedByUser(userId, artworkId),
      this.isFavoritedByUser(userId, artworkId)
    ])
    return { liked, faved }
  }

  async getBatchLikeCounts(artworkIds: string[]): Promise<Record<string, number>> {
    if (artworkIds.length === 0) return {}
    
    const placeholders = artworkIds.map(() => '?').join(',')
    const stmt = this.db.prepare(`
      SELECT artwork_id, COUNT(*) as count 
      FROM artworks_like 
      WHERE artwork_id IN (${placeholders})
      GROUP BY artwork_id
    `)
    
    const rows = await stmt.bind(...artworkIds).all() as any
    const result: Record<string, number> = {}
    
    ;(rows.results || []).forEach((row: any) => {
      result[String(row.artwork_id)] = Number(row.count || 0)
    })
    
    return result
  }

  async getBatchFavoriteCounts(artworkIds: string[]): Promise<Record<string, number>> {
    if (artworkIds.length === 0) return {}
    
    const placeholders = artworkIds.map(() => '?').join(',')
    const stmt = this.db.prepare(`
      SELECT artwork_id, COUNT(*) as count 
      FROM artworks_favorite 
      WHERE artwork_id IN (${placeholders})
      GROUP BY artwork_id
    `)
    
    const rows = await stmt.bind(...artworkIds).all() as any
    const result: Record<string, number> = {}
    
    ;(rows.results || []).forEach((row: any) => {
      result[String(row.artwork_id)] = Number(row.count || 0)
    })
    
    return result
  }

  async getBatchUserArtworkStates(userId: string, artworkIds: string[]): Promise<Record<string, { liked: boolean; faved: boolean }>> {
    if (artworkIds.length === 0) return {}
    
    const placeholders = artworkIds.map(() => '?').join(',')
    
    // 获取点赞状态
    const likesStmt = this.db.prepare(`
      SELECT artwork_id FROM artworks_like 
      WHERE user_id = ? AND artwork_id IN (${placeholders})
    `)
    const likesRows = await likesStmt.bind(userId, ...artworkIds).all() as any
    const likedSet = new Set((likesRows.results || []).map((row: any) => String(row.artwork_id)))
    
    // 获取收藏状态
    const favsStmt = this.db.prepare(`
      SELECT artwork_id FROM artworks_favorite 
      WHERE user_id = ? AND artwork_id IN (${placeholders})
    `)
    const favsRows = await favsStmt.bind(userId, ...artworkIds).all() as any
    const favedSet = new Set((favsRows.results || []).map((row: any) => String(row.artwork_id)))
    
    const result: Record<string, { liked: boolean; faved: boolean }> = {}
    artworkIds.forEach(id => {
      result[id] = {
        liked: likedSet.has(id),
        faved: favedSet.has(id)
      }
    })
    
    return result
  }

  /**
   * 获取指定时间范围内的作品
   */
  async getArtworksInTimeRange(startTime: number, endTime: number): Promise<Array<{id: string, createdAt: number}>> {
    const stmt = this.db.prepare(`
      SELECT id, created_at 
      FROM artworks 
      WHERE created_at >= ? AND created_at <= ?
      ORDER BY created_at DESC
    `)
    const rows = await stmt.bind(startTime, endTime).all() as any
    
    return (rows.results || []).map((row: any) => ({
      id: String(row.id),
      createdAt: Number(row.created_at)
    }))
  }

  // 新增：获取作品互动数据
  async getArtworkInteractionData(artworkId: string) {
    const [likes, favorites, comments, shares, views] = await Promise.all([
      this.getLikeCount(artworkId),
      this.getFavoriteCount(artworkId),
      this.getCommentCount(artworkId),
      this.getShareCount(artworkId),
      this.getViewCount(artworkId)
    ]);
    
    return { likes, favorites, comments, shares, views };
  }

  // 新增：更新作品热度字段
  async updateArtworkHotness(artworkId: string, hotScore: number, hotLevel: string) {
    const now = Date.now();
    await this.db.prepare(`
      UPDATE artworks 
      SET hot_score = ?, hot_level = ?, last_hot_update = ?
      WHERE id = ?
    `).bind(hotScore, hotLevel, now, artworkId).run();
    
    // 记录历史
    await this.logHotnessHistory(artworkId, hotScore, hotLevel, 'realtime');
  }

  // 新增：获取作品热度数据
  async getArtworkHotData(artworkId: string) {
    return await this.db.prepare(`
      SELECT id, hot_score, hot_level, last_hot_update, 
             like_count, favorite_count, view_count, share_count, comment_count,
             title, user_id, created_at, published_at, engagement_weight
      FROM artworks WHERE id = ?
    `).bind(artworkId).first();
  }

  // 新增：批量获取热度数据
  async getArtworksHotData(artworkIds: string[]) {
    if (artworkIds.length === 0) return [];
    
    const placeholders = artworkIds.map(() => '?').join(',');
    const rows = await this.db.prepare(`
      SELECT id, hot_score, hot_level, last_hot_update,
             like_count, favorite_count, view_count, share_count, comment_count,
             title, user_id, created_at, published_at, engagement_weight
      FROM artworks WHERE id IN (${placeholders})
    `).bind(...artworkIds).all() as any;
    
    return (rows.results || []).map((row: any) => ({
      id: String(row.id),
      hot_score: Number(row.hot_score || 0),
      hot_level: String(row.hot_level || 'new'),
      last_hot_update: Number(row.last_hot_update || 0),
      like_count: Number(row.like_count || 0),
      favorite_count: Number(row.favorite_count || 0),
      view_count: Number(row.view_count || 0),
      share_count: Number(row.share_count || 0),
      comment_count: Number(row.comment_count || 0),
      title: String(row.title || ''),
      user_id: String(row.user_id || ''),
      created_at: Number(row.created_at || 0),
      published_at: Number(row.published_at || 0),
      engagement_weight: Number(row.engagement_weight || 0)
    }));
  }

  // 新增：记录热度历史
  async logHotnessHistory(
    artworkId: string, 
    hotScore: number, 
    hotLevel: string, 
    method: string,
    metadata?: any
  ) {
    const id = crypto.randomUUID();
    const now = Date.now();
    
    await this.db.prepare(`
      INSERT INTO artworks_hot_history 
      (id, artwork_id, hot_score, hot_level, calculated_at, calculation_method, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, artworkId, hotScore, hotLevel, now, method, 
      metadata ? JSON.stringify(metadata) : null
    ).run();
  }

  // 新增：获取需要重新计算热度的作品
  async getArtworksNeedingHotUpdate(limit: number = 100) {
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    const rows = await this.db.prepare(`
      SELECT a.*, 
             (SELECT COUNT(*) FROM artworks_like WHERE artwork_id = a.id) as actual_likes,
             (SELECT COUNT(*) FROM artworks_favorite WHERE artwork_id = a.id) as actual_favorites
      FROM artworks a
      WHERE a.last_hot_update < ? OR a.hot_score IS NULL
      ORDER BY a.created_at DESC
      LIMIT ?
    `).bind(twentyFourHoursAgo, limit).all() as any;
    
    return (rows.results || []).map((row: any) => ({
      id: String(row.id),
      title: String(row.title || ''),
      user_id: String(row.user_id),
      created_at: Number(row.created_at),
      published_at: Number(row.published_at || 0),
      like_count: Number(row.actual_likes || 0),
      favorite_count: Number(row.actual_favorites || 0),
      hot_score: Number(row.hot_score || 0),
      hot_level: String(row.hot_level || 'new'),
      last_hot_update: Number(row.last_hot_update || 0)
    }));
  }

  // 新增：获取评论数量
  async getCommentCount(artworkId: string): Promise<number> {
    // TODO: 当评论功能实现后，这里需要连接到实际的评论表
    return 0;
  }

  // 新增：获取分享数量
  async getShareCount(artworkId: string): Promise<number> {
    // TODO: 当分享功能实现后，这里需要连接到实际的分享表
    return 0;
  }

  // 新增：获取浏览数量
  async getViewCount(artworkId: string): Promise<number> {
    // TODO: 当浏览统计功能实现后，这里需要连接到实际的浏览记录表
    return 0;
  }

  // 新增：KIE 生成状态管理相关方法
  async updateArtworkGenerationStatus(artworkId: string, status: {
    taskId?: string
    status?: string
    startedAt?: number
    completedAt?: number
    errorMessage?: string
    resultImageUrl?: string
  }): Promise<void> {
    const updates = []
    const values = []
    
    if (status.taskId) {
      updates.push('kie_task_id = ?')
      values.push(status.taskId)
    }
    
    if (status.status) {
      updates.push('kie_generation_status = ?')
      values.push(status.status)
    }
    
    if (status.startedAt) {
      updates.push('kie_generation_started_at = ?')
      values.push(status.startedAt)
    }
    
    if (status.completedAt) {
      updates.push('kie_generation_completed_at = ?')
      values.push(status.completedAt)
    }
    
    if (status.errorMessage) {
      updates.push('kie_error_message = ?')
      values.push(status.errorMessage)
    }
    
    if (status.resultImageUrl) {
      updates.push('kie_result_image_url = ?')
      values.push(status.resultImageUrl)
    }
    
    if (updates.length > 0) {
      values.push(artworkId)
      const stmt = this.db.prepare(`
        UPDATE artworks 
        SET ${updates.join(', ')}, updated_at = ?
        WHERE id = ?
      `)
      await stmt.bind(Date.now(), ...values).run()
    }
  }

  async updateKieArtworkInfo(artworkId: string, info: {
    model?: string
    aspectRatio?: string
    outputFormat?: string
    originalImageUrl?: string
  }): Promise<void> {
    const updates = []
    const values = []
    
    // 验证并设置kie_model，确保符合CHECK约束
    if (info.model && typeof info.model === 'string' && info.model.trim() && ['flux-kontext-pro', 'flux-kontext-max'].includes(info.model.trim())) {
      updates.push('kie_model = ?')
      values.push(info.model.trim())
    } else {
      // 如果model无效或未提供，使用默认值
      updates.push('kie_model = ?')
      values.push('flux-kontext-pro')
    }
    
    // 验证并设置kie_aspect_ratio，确保符合CHECK约束
    if (info.aspectRatio && typeof info.aspectRatio === 'string' && info.aspectRatio.trim() && ['1:1', '16:9', '9:16', '4:3', '3:4'].includes(info.aspectRatio.trim())) {
      updates.push('kie_aspect_ratio = ?')
      values.push(info.aspectRatio.trim())
    } else {
      // 如果aspectRatio无效或未提供，使用默认值
      updates.push('kie_aspect_ratio = ?')
      values.push('1:1')
    }
    
    // 验证并设置kie_output_format，确保符合CHECK约束
    if (info.outputFormat && typeof info.outputFormat === 'string' && info.outputFormat.trim() && ['png', 'jpeg'].includes(info.outputFormat.trim())) {
      updates.push('kie_output_format = ?')
      values.push(info.outputFormat.trim())
    } else {
      // 如果outputFormat无效或未提供，使用默认值
      updates.push('kie_output_format = ?')
      values.push('png')
    }
    
    if (info.originalImageUrl && typeof info.originalImageUrl === 'string' && info.originalImageUrl.trim()) {
      updates.push('kie_original_image_url = ?')
      values.push(info.originalImageUrl.trim())
    }
    
    if (updates.length > 0) {
      const stmt = this.db.prepare(`
        UPDATE artworks 
        SET ${updates.join(', ')}, updated_at = ?
        WHERE id = ?
      `)
      await stmt.bind(...values, Date.now(), artworkId).run()
    }
  }

  // 新增：更新作品URL的方法
  async updateArtworkUrl(artworkId: string, resultImageUrl: string, thumbUrl?: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE artworks 
      SET url = ?, thumb_url = ?, updated_at = ?
      WHERE id = ?
    `)
    await stmt.bind(resultImageUrl, thumbUrl || resultImageUrl, Date.now(), artworkId).run()
  }

  // 新增：确保slug不为空的方法
  async ensureArtworkSlug(artworkId: string, title: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE artworks 
      SET slug = CASE WHEN COALESCE(slug, '') = '' THEN ? ELSE slug END,
          updated_at = ?
      WHERE id = ?
    `)
    const slug = this.generateSlug(title || 'untitled')
    await stmt.bind(slug, Date.now(), artworkId).run()
  }

  // 新增：更新作品状态的方法
  async updateArtworkStatus(artworkId: string, status: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE artworks 
      SET status = ?, updated_at = ?
      WHERE id = ?
    `)
    await stmt.bind(status, Date.now(), artworkId).run()
  }

  async getArtworkByKieTaskId(taskId: string): Promise<{id: string; user_id: string; kie_generation_status: string; kie_error_message?: string} | null> {
    const stmt = this.db.prepare(`
      SELECT id, user_id, kie_generation_status, kie_error_message
      FROM artworks 
      WHERE kie_task_id = ?
    `)
    const result = await stmt.bind(taskId).first() as any
    
    if (!result) return null
    
    return {
      id: String(result.id),
      user_id: String(result.user_id),
      kie_generation_status: String(result.kie_generation_status),
      kie_error_message: result.kie_error_message ? String(result.kie_error_message) : undefined
    }
  }

  async getKieArtworkData(artworkId: string): Promise<{
    kie_task_id?: string
    kie_generation_status?: string
    kie_original_image_url?: string
    kie_result_image_url?: string
    kie_generation_started_at?: number
    kie_generation_completed_at?: number
    kie_error_message?: string
    kie_model?: string
    kie_aspect_ratio?: string
    kie_prompt?: string
  } | null> {
    const stmt = this.db.prepare(`
      SELECT 
        kie_task_id,
        kie_generation_status,
        kie_original_image_url,
        kie_result_image_url,
        kie_generation_started_at,
        kie_generation_completed_at,
        kie_error_message,
        kie_model,
        kie_aspect_ratio,
        kie_prompt
      FROM artworks 
      WHERE id = ?
    `)
    const result = await stmt.bind(artworkId).first() as any
    
    if (!result) return null
    
    return {
      kie_task_id: result.kie_task_id ? String(result.kie_task_id) : undefined,
      kie_generation_status: result.kie_generation_status ? String(result.kie_generation_status) : undefined,
      kie_original_image_url: result.kie_original_image_url ? String(result.kie_original_image_url) : undefined,
      kie_result_image_url: result.kie_result_image_url ? String(result.kie_result_image_url) : undefined,
      kie_generation_started_at: result.kie_generation_started_at ? Number(result.kie_generation_started_at) : undefined,
      kie_generation_completed_at: result.kie_generation_completed_at ? Number(result.kie_generation_completed_at) : undefined,
      kie_error_message: result.kie_error_message ? String(result.kie_error_message) : undefined,
      kie_model: result.kie_model ? String(result.kie_model) : undefined,
      kie_aspect_ratio: result.kie_aspect_ratio ? String(result.kie_aspect_ratio) : undefined,
      kie_prompt: result.kie_prompt ? String(result.kie_prompt) : undefined
    }
  }

  async listKieGeneratingArtworks(limit = 50): Promise<Array<{
    id: string
    title: string
    user_id: string
    kie_task_id: string
    kie_model: string
    kie_aspect_ratio: string
    kie_prompt: string
    kie_generation_started_at: number
  }>> {
    const stmt = this.db.prepare(`
      SELECT 
        id, title, user_id, kie_task_id, kie_model, 
        kie_aspect_ratio, kie_prompt, kie_generation_started_at
      FROM artworks 
      WHERE kie_generation_status = 'generating'
      ORDER BY kie_generation_started_at ASC
      LIMIT ?
    `)
    const rows = await stmt.bind(limit).all() as any
    
    return (rows.results || []).map((row: any) => ({
      id: String(row.id),
      title: String(row.title || 'Untitled'),
      user_id: String(row.user_id),
      kie_task_id: String(row.kie_task_id),
      kie_model: String(row.kie_model || 'flux-kontext-pro'),
      kie_aspect_ratio: String(row.kie_aspect_ratio || '1:1'),
      kie_prompt: String(row.kie_prompt || ''),
      kie_generation_started_at: Number(row.kie_generation_started_at)
    }))
  }

  async createKieArtwork(
    userId: string,
    title: string,
    options: {
      prompt: string
      model?: string
      aspectRatio?: string
      status?: string
      inputImage?: string
      taskId?: string
    }
  ): Promise<string> {
    const id = crypto.randomUUID()
    const slug = this.generateSlug(title || 'untitled')
    const now = Date.now()
    
    // 确保url字段不为空 - 使用原图URL或默认图片
    const imageUrl = options.inputImage || 'https://via.placeholder.com/1024x1024?text=Generating...'
    
    const stmt = this.db.prepare(`
      INSERT INTO artworks (
        id, user_id, title, url, thumb_url, slug, status, created_at, updated_at,
        kie_task_id, kie_generation_status, kie_model, kie_aspect_ratio, kie_prompt, kie_original_image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    await stmt.bind(
      id, 
      userId, 
      title, 
      imageUrl, // url - 使用原图URL或默认图片
      imageUrl, // thumb_url - 使用原图URL或默认图片
      slug, 
      options.status || 'generating',
      now, // created_at
      now, // updated_at
      options.taskId || null, // kie_task_id
      'generating', // kie_generation_status
      options.model || 'flux-kontext-pro', // kie_model
      options.aspectRatio || '1:1', // kie_aspect_ratio
      options.prompt, // kie_prompt
      options.inputImage || null // kie_original_image_url
    ).run()
    
    return id
  }
}


