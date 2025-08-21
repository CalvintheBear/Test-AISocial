import { D1Service } from './d1'

export class CreditsService {
  constructor(private db: D1Database) {}
  static fromEnv(env: any) {
    const d1 = D1Service.fromEnv(env) as any
    return new CreditsService(d1.db || env.DB)
  }

  private async ensureTables(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_credits (
        user_id TEXT PRIMARY KEY,
        balance INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        status TEXT NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL,
        credits INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        raw JSON
      );
    ` as any)
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

  async createOrUpdatePayment(opts: {
    id: string
    userId: string
    provider: string
    status: string
    amount: number
    currency: string
    credits: number
    raw?: any
  }): Promise<void> {
    await this.ensureTables()
    const now = Date.now()
    await this.db.prepare(`
      INSERT INTO payments (id, user_id, provider, status, amount, currency, credits, created_at, updated_at, raw)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at, raw = excluded.raw
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
      JSON.stringify(opts.raw || null)
    ).run()
  }
}


