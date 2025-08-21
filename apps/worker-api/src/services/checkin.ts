import { D1Service } from './d1'

export class CheckinService {
  private db: D1Database

  constructor(db: D1Database) {
    this.db = db
  }

  static fromEnv(env: any): CheckinService {
    if (!env.DB) throw new Error('DB binding not found')
    return new CheckinService(env.DB)
  }

  private async ensureTables(): Promise<void> {
    // 首选带外键版本，失败则回退到无外键版本，避免生产环境中表结构不一致导致的创建失败
    // 注意：D1 的 exec 在某些环境对分号结尾较敏感，去掉末尾分号并用一行定义
    try {
      await this.db.exec(
        'CREATE TABLE IF NOT EXISTS user_checkins (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, checkin_date TEXT NOT NULL, created_at INTEGER NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE)'
      )
    } catch {
      await this.db.exec(
        'CREATE TABLE IF NOT EXISTS user_checkins (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, checkin_date TEXT NOT NULL, created_at INTEGER NOT NULL)'
      )
    }
    try {
      await this.db.exec(
        'CREATE TABLE IF NOT EXISTS checkin_credits (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, checkin_id INTEGER NOT NULL, credits INTEGER NOT NULL DEFAULT 12, expires_at INTEGER NOT NULL, expired_at INTEGER, created_at INTEGER NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (checkin_id) REFERENCES user_checkins(id) ON DELETE CASCADE)'
      )
    } catch {
      await this.db.exec(
        'CREATE TABLE IF NOT EXISTS checkin_credits (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, checkin_id INTEGER NOT NULL, credits INTEGER NOT NULL DEFAULT 12, expires_at INTEGER NOT NULL, expired_at INTEGER, created_at INTEGER NOT NULL)'
      )
    }
    // 创建索引
    try { await this.db.exec('CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON user_checkins(user_id, checkin_date)') } catch {}
    try { await this.db.exec('CREATE INDEX IF NOT EXISTS idx_checkins_date ON user_checkins(checkin_date)') } catch {}
    try { await this.db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_user_date_unique ON user_checkins(user_id, checkin_date)') } catch {}
    try { await this.db.exec('CREATE INDEX IF NOT EXISTS idx_checkin_credits_user ON checkin_credits(user_id)') } catch {}
    try { await this.db.exec('CREATE INDEX IF NOT EXISTS idx_checkin_credits_expires ON checkin_credits(expires_at)') } catch {}
    try { await this.db.exec('CREATE INDEX IF NOT EXISTS idx_checkin_credits_expired ON checkin_credits(expired_at)') } catch {}
  }

  // 获取今天的日期字符串 (YYYY-MM-DD)
  private getTodayString(): string {
    const now = new Date()
    return now.toISOString().split('T')[0]
  }

  // 获取昨天的日期字符串
  private getYesterdayString(): string {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }

  // 检查今天是否已签到
  async hasCheckedInToday(userId: string): Promise<boolean> {
    await this.ensureTables()
    const today = this.getTodayString()
    const row = await this.db.prepare(`
      SELECT id FROM user_checkins 
      WHERE user_id = ? AND checkin_date = ?
    `).bind(userId, today).first() as any
    return !!row?.id
  }

  // 获取用户签到统计
  async getCheckinStats(userId: string): Promise<{
    todayCheckedIn: boolean
    consecutiveDays: number
    totalCheckins: number
    lastCheckinDate: string | null
  }> {
    await this.ensureTables()
    const today = this.getTodayString()
    
    // 检查今天是否已签到
    const todayCheckedIn = await this.hasCheckedInToday(userId)
    
    // 获取总签到次数
    const totalResult = await this.db.prepare(`
      SELECT COUNT(*) as count FROM user_checkins WHERE user_id = ?
    `).bind(userId).first() as any
    const totalCheckins = Number(totalResult?.count || 0)
    
    // 获取最后签到日期
    const lastResult = await this.db.prepare(`
      SELECT checkin_date FROM user_checkins 
      WHERE user_id = ? 
      ORDER BY checkin_date DESC 
      LIMIT 1
    `).bind(userId).first() as any
    const lastCheckinDate = lastResult?.checkin_date || null
    
    // 计算连续签到天数
    let consecutiveDays = 0
    if (lastCheckinDate) {
      const currentDate = new Date()
      let checkDate = new Date(lastCheckinDate)
      
      while (checkDate <= currentDate) {
        const dateStr = checkDate.toISOString().split('T')[0]
        const hasCheckedIn = await this.db.prepare(`
          SELECT id FROM user_checkins 
          WHERE user_id = ? AND checkin_date = ?
        `).bind(userId, dateStr).first() as any
        
        if (hasCheckedIn?.id) {
          consecutiveDays++
          checkDate.setDate(checkDate.getDate() + 1)
        } else {
          break
        }
      }
    }
    
    return {
      todayCheckedIn,
      consecutiveDays,
      totalCheckins,
      lastCheckinDate
    }
  }

  // 执行签到
  async checkin(userId: string): Promise<{
    success: boolean
    message: string
    creditsAdded: number
    consecutiveDays: number
  }> {
    await this.ensureTables()
    
    // 检查今天是否已签到
    if (await this.hasCheckedInToday(userId)) {
      return {
        success: false,
        message: '今天已经签到过了',
        creditsAdded: 0,
        consecutiveDays: 0
      }
    }
    
    const now = Date.now()
    const today = this.getTodayString()
    
    // 插入签到记录
    const insertRes = await this.db.prepare(`
      INSERT INTO user_checkins (user_id, checkin_date, created_at)
      VALUES (?, ?, ?)
    `).bind(userId, today, now).run() as any
    
    // 兼容某些环境 meta 为空的情况
    let checkinId: number | string | null = insertRes?.meta?.last_row_id ?? null
    if (!checkinId) {
      const row = await this.db.prepare(`SELECT id FROM user_checkins WHERE user_id = ? AND checkin_date = ?`)
        .bind(userId, today).first() as any
      checkinId = row?.id || null
    }
    if (!checkinId) {
      throw new Error('CHECKIN_INSERT_FAILED')
    }
    
    // 计算过期时间（隔天过期）
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0) // 设置为明天0点
    const expiresAt = tomorrow.getTime()
    
    // 插入签到积分记录
    await this.db.prepare(`
      INSERT INTO checkin_credits (user_id, checkin_id, credits, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(userId, checkinId, 12, expiresAt, now).run()
    
    // 添加积分到用户余额
    const { CreditsService } = await import('./credits')
    const creditsService = new CreditsService(this.db)
    await creditsService.addCredits(userId, 12)
    
    // 获取连续签到天数
    const stats = await this.getCheckinStats(userId)
    
    return {
      success: true,
      message: '签到成功！获得12积分',
      creditsAdded: 12,
      consecutiveDays: stats.consecutiveDays
    }
  }

  // 过期签到积分
  async expireCheckinCredits(now: number = Date.now()): Promise<number> {
    await this.ensureTables()
    
    // 找到已过期但未标记的签到积分
    const rows = await this.db.prepare(`
      SELECT cc.id, cc.user_id, cc.credits 
      FROM checkin_credits cc
      WHERE cc.expires_at <= ? AND (cc.expired_at IS NULL OR cc.expired_at = 0)
    `).bind(now).all() as any
    
    let affected = 0
    for (const row of rows.results || []) {
      const userId = String(row.user_id)
      const credits = Number(row.credits || 0)
      
      if (credits > 0) {
        // 从用户余额中扣除积分
        const { CreditsService } = await import('./credits')
        const creditsService = new CreditsService(this.db)
        await creditsService.addCredits(userId, -credits)
      }
      
      // 标记为已过期
      await this.db.prepare(`
        UPDATE checkin_credits 
        SET expired_at = ? 
        WHERE id = ?
      `).bind(now, row.id).run()
      
      affected++
    }
    
    return affected
  }
}
