import slugify from 'slugify'

/**
 * 根据标题生成URL友好的slug
 * @param title 作品标题
 * @returns 生成的slug
 */
export function generateSlug(title: string): string {
  if (!title || title.trim() === '') {
    return 'untitled'
  }
  
  return slugify(title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
    trim: true
  })
}

/**
 * 解决slug冲突，追加短ID
 * @param baseSlug 基础slug
 * @param artworkId 作品ID（用于解决冲突）
 * @returns 带冲突解决的slug
 */
export function resolveSlugConflict(baseSlug: string, artworkId: string): string {
  // 使用作品ID的前8位作为短ID
  const shortId = artworkId.substring(0, 8)
  return `${baseSlug}-${shortId}`
}

/**
 * 生成唯一的slug（处理冲突）
 * @param title 作品标题
 * @param artworkId 作品ID
 * @param existingSlugs 已存在的slug列表（用于检查冲突）
 * @returns 唯一的slug
 */
export function generateUniqueSlug(
  title: string, 
  artworkId: string, 
  existingSlugs: string[] = []
): string {
  const baseSlug = generateSlug(title)
  
  // 如果没有冲突，直接使用基础slug
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug
  }
  
  // 有冲突时，追加短ID
  return resolveSlugConflict(baseSlug, artworkId)
}