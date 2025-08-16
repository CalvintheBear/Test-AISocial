import { D1Database } from '@cloudflare/workers-types'
import { generateUniqueSlug } from '../utils/slug'

interface Env {
  DB: D1Database
}

/**
 * 为现有artworks回填slug值的数据迁移脚本
 */
export async function migrateSlugs(env: Env) {
  try {
    console.log('开始迁移现有作品的slug...')
    
    // 1. 获取所有现有作品
    const artworks = await env.DB.prepare(
      'SELECT id, title FROM artworks WHERE slug IS NULL'
    ).all()
    
    if (!artworks.results || artworks.results.length === 0) {
      console.log('没有需要迁移的作品')
      return
    }
    
    console.log(`找到 ${artworks.results.length} 个需要迁移的作品`)
    
    // 2. 获取所有已存在的slug
    const existingSlugsResult = await env.DB.prepare(
      'SELECT slug FROM artworks WHERE slug IS NOT NULL'
    ).all()
    
    const existingSlugs = existingSlugsResult.results 
      ? existingSlugsResult.results.map(row => (row as any).slug) 
      : []
    
    // 3. 为每个作品生成唯一slug并更新
    let updatedCount = 0
    for (const artwork of artworks.results) {
      const { id, title } = artwork as any
      
      // 生成唯一slug
      const slug = generateUniqueSlug(title || 'untitled', id, existingSlugs)
      
      // 更新数据库
      await env.DB.prepare(
        'UPDATE artworks SET slug = ? WHERE id = ?'
      ).bind(slug, id).run()
      
      existingSlugs.push(slug)
      updatedCount++
      
      console.log(`已更新作品 ${id}: ${slug}`)
    }
    
    console.log(`迁移完成！共更新 ${updatedCount} 个作品`)
    
  } catch (error) {
    console.error('迁移失败:', error)
    throw error
  }
}