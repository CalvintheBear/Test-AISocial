import { D1Service } from './d1'

export class CreditsService {
  constructor(public db: D1Database) {}
  static fromEnv(env: any) {
    if (!env.DB) {
      throw new Error('D1 database binding DB not found in environment')
    }
    return new CreditsService(env.DB)
  }

  private async ensureTables(): Promise<void> {
    await this.db.exec(
      'CREATE TABLE IF NOT EXISTS user_credits (user_id TEXT PRIMARY KEY, balance INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)'
    )
    await this.db.exec(
      'CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, provider TEXT NOT NULL, status TEXT NOT NULL, amount INTEGER NOT NULL, currency TEXT NOT NULL, credits INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, expires_at INTEGER, expired_at INTEGER, raw TEXT)'
    )
    // 对已有表进行列升级（忽略已存在错误）
    try { await this.db.exec('ALTER TABLE payments ADD COLUMN expires_at INTEGER') } catch {}
    try { await this.db.exec('ALTER TABLE payments ADD COLUMN expired_at INTEGER') } catch {}
  }

  async getBalance(userId: string): Promise<number> {
    await this.ensureTables()
    const row = await this.db.prepare(`SELECT balance FROM user_credits WHERE user_id = ?`).bind(userId).first() as any
    return Number(row?.balance || 0)
  }

  async addCredits(userId: string, credits: number): Promise<number> {
    await this.ensureTables()
    const now = Date.now()
    const row = await this.db.prepare(`SELECT balance FROM user_credits WHERE user_id = ?`).bind(userId).first() as any
    const current = Number(row?.balance || 0)
    const next = Math.max(0, current + credits)
    await this.db.prepare(`
      INSERT INTO user_credits (user_id, balance, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET balance = excluded.balance, updated_at = excluded.updated_at
    `).bind(userId, next, now).run()
    return next
  }

  // 定期过期：将到期订单的积分扣除
  async expireDueCredits(now: number = Date.now()): Promise<number> {
    await this.ensureTables()
    // 找到已到期但未标记 expired 的订单
    const rows = await this.db.prepare(`SELECT id, user_id, credits FROM payments WHERE status = 'succeeded' AND expires_at IS NOT NULL AND expires_at <= ? AND (expired_at IS NULL OR expired_at = 0)`).bind(now).all() as any
    let affected = 0
    for (const r of rows.results || []) {
      const userId = String(r.user_id)
      const credits = Number(r.credits || 0)
      if (credits > 0) {
        await this.addCredits(userId, -credits)
      }
      await this.db.prepare(`UPDATE payments SET expired_at = ? WHERE id = ?`).bind(now, r.id).run()
      affected++
    }
    return affected
  }

  async createOrUpdatePayment(opts: {
    id: string
    userId: string
    provider: string
    status: string
    amount: number
    currency: string
    credits: number
    raw?: any
    expiresAt?: number | null
    expiredAt?: number | null
  }): Promise<void> {
    await this.ensureTables()
    const now = Date.now()
    await this.db.prepare(`
      INSERT INTO payments (id, user_id, provider, status, amount, currency, credits, created_at, updated_at, expires_at, expired_at, raw)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at, expires_at = COALESCE(excluded.expires_at, payments.expires_at), expired_at = COALESCE(excluded.expired_at, payments.expired_at), raw = excluded.raw
    `).bind(
      opts.id,
      opts.userId,
      opts.provider,
      opts.status,
      opts.amount,
      opts.currency,
      opts.credits,
      now,
      now,
      opts.expiresAt ?? null,
      opts.expiredAt ?? null,
      JSON.stringify(opts.raw || null)
    ).run()
  }

  async getPayment(id: string): Promise<{ userId: string | null; credits: number | null; status: string | null } | null> {
    await this.ensureTables()
    const row = await this.db.prepare(`SELECT user_id, credits, status FROM payments WHERE id = ?`).bind(id).first() as any
    if (!row) return null
    return {
      userId: row.user_id ? String(row.user_id) : null,
      credits: row.credits != null ? Number(row.credits) : null,
      status: row.status ? String(row.status) : null,
    }
  }
}


