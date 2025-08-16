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

const demoUser: User = { id: 'dev-user', name: '演示用户', profilePic: 'https://via.placeholder.com/120x120/3b74ff/ffffff?text=演' }
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
    if (!this.db) {
      return memArtworks.get(id) || null
    }

    try {
      const stmt = this.db.prepare(`
        SELECT a.*, u.name as user_name, u.profile_pic
        FROM artworks a
        JOIN users u ON a.user_id = u.id
        WHERE a.id = ?
      `)
      const row = await stmt.bind(id).first() as any
      
      if (!row) return null
      
      return {
        id: String(row.id),
        slug: this.generateSlug(String(row.title) || 'untitled'),
        title: String(row.title || 'Untitled'),
        url: String(row.url),
        status: (row.status === 'draft' || row.status === 'published') ? row.status : 'draft',
        author: {
          id: String(row.user_id),
          name: String(row.user_name),
          profilePic: row.profile_pic ? String(row.profile_pic) : undefined
        },
        likeCount: 0, // Will be updated by Redis
        createdAt: Number(row.created_at)
      }
    } catch (error) {
      console.warn('D1 query failed, using memory fallback:', error)
      return memArtworks.get(id) || null
    }
  }

  async listFeed(limit = 20): Promise<Artwork[]> {
    if (!this.db) {
      // Fallback to memory data
      return Array.from(memArtworks.values()).filter(a => a.status === 'published').slice(0, limit)
    }

    try {
      const stmt = this.db.prepare(`
        SELECT a.*, u.name as user_name, u.profile_pic
        FROM artworks a
        JOIN users u ON a.user_id = u.id
        WHERE a.status = 'published'
        ORDER BY a.created_at DESC
        LIMIT ?
      `)
      const rows = await stmt.bind(limit).all() as any
      
      return (rows.results || []).map((row: any) => ({
        id: String(row.id),
        slug: this.generateSlug(String(row.title) || 'untitled'),
        title: String(row.title || 'Untitled'),
        url: String(row.url),
        status: (row.status === 'draft' || row.status === 'published') ? row.status : 'draft',
        author: {
          id: String(row.user_id),
          name: String(row.user_name),
          profilePic: row.profile_pic ? String(row.profile_pic) : undefined
        },
        likeCount: 0,
        createdAt: Number(row.created_at)
      }))
    } catch (error) {
      console.warn('D1 query failed, using memory fallback:', error)
      return Array.from(memArtworks.values()).filter(a => a.status === 'published').slice(0, limit)
    }
  }

  async listUserArtworks(userId: string): Promise<Artwork[]> {
    if (!this.db) {
      // Fallback to memory data
      return Array.from(memArtworks.values()).filter(a => a.author.id === userId)
    }

    try {
      const stmt = this.db.prepare(`
        SELECT a.*, u.name as user_name, u.profile_pic
        FROM artworks a
        JOIN users u ON a.user_id = u.id
        WHERE a.user_id = ?
        ORDER BY a.created_at DESC
      `)
      const rows = await stmt.bind(userId).all() as any
      
      return (rows.results || []).map((row: any) => ({
        id: String(row.id),
        slug: this.generateSlug(String(row.title) || 'untitled'),
        title: String(row.title || 'Untitled'),
        url: String(row.url),
        status: (row.status === 'draft' || row.status === 'published') ? row.status : 'draft',
        author: {
          id: String(row.user_id),
          name: String(row.user_name),
          profilePic: row.profile_pic ? String(row.profile_pic) : undefined
        },
        likeCount: 0,
        createdAt: Number(row.created_at)
      }))
    } catch (error) {
      console.warn('D1 query failed, using memory fallback:', error)
      return Array.from(memArtworks.values()).filter(a => a.author.id === userId)
    }
  }

  async publishArtwork(id: string): Promise<Artwork | null> {
    if (!this.db) {
      // Fallback to memory data
      const a = memArtworks.get(id)
      if (!a) return null
      a.status = 'published'
      return a
    }

    try {
      const stmt = this.db.prepare(`
        UPDATE artworks SET status = 'published' WHERE id = ?
      `)
      await stmt.bind(id).run()
      
      return this.getArtwork(id)
    } catch (error) {
      console.warn('D1 update failed, using memory fallback:', error)
      const a = memArtworks.get(id)
      if (!a) return null
      a.status = 'published'
      return a
    }
  }

  async createArtwork(userId: string, title: string, url: string): Promise<string> {
    if (!this.db) {
      const id = `a${Date.now()}`
      memArtworks.set(id, {
        id,
        slug: this.generateSlug(title),
        title,
        url,
        status: 'draft',
        author: demoUser,
        likeCount: 0,
        createdAt: Date.now()
      })
      return id
    }

    const id = crypto.randomUUID()
    const stmt = this.db.prepare(`
      INSERT INTO artworks (id, user_id, title, url, status, created_at)
      VALUES (?, ?, ?, ?, 'draft', ?)
    `)
    await stmt.bind(id, userId, title, url, Date.now()).run()
    return id
  }

  private generateSlug(title: string): string {
    return title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .trim()
  }
}


