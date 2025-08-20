import { Hono } from 'hono'
import { D1Service } from '../services/d1'
import { RedisService } from '../services/redis'
import { PaginationQuerySchema, validateParam } from '../schemas/validation'
import { ok, fail } from '../utils/response'
import { formatArtworkForAPI, formatArtworkListForAPI } from '../utils/formatters'

const router = new Hono()

router.get('/', async (c) => {
  try {
    const query = c.req.query()
    const userId = (c as any).get('userId') as string
    const d1 = D1Service.fromEnv(c.env)
    const redis = RedisService.fromEnv(c.env)
    
    const { limit = 20, page = 1 } = validateParam(PaginationQuerySchema, { limit: query.limit || '20', page: query.page || '1' }) as { limit: number; page: number }
    
    const isFeed = query.feed === '1'
    const isMine = query.mine === '1'
    const isLiked = query.liked === '1'
    const isFaved = query.faved === '1'
    
    let artworks: any[] = []
    let artworkIds: string[] = []
    
    // Fetch artworks based on query parameters
    if (isFeed) {
      // Get feed from Redis cache or D1
      const cached = await redis.getFeed(limit)
      if (cached) {
        artworks = JSON.parse(cached)
      } else {
        artworks = await d1.listFeed(limit)
        await redis.setFeed(limit, JSON.stringify(artworks), 600)
      }
    } else if (isMine) {
      if (!userId) return c.json(fail('UNAUTHORIZED', 'Authentication required'), 401)
      artworks = await d1.listUserArtworks(userId)
    } else if (isLiked) {
      if (!userId) return c.json(fail('UNAUTHORIZED', 'Authentication required'), 401)
      const likedArtworkIds = await redis.listUserLikes(userId)
      if (likedArtworkIds.length > 0) {
        artworks = await Promise.all(likedArtworkIds.map(id => d1.getArtwork(id)))
        artworks = artworks.filter(Boolean)
      }
    } else if (isFaved) {
      if (!userId) return c.json(fail('UNAUTHORIZED', 'Authentication required'), 401)
      const favoritedArtworkIds = await d1.listUserFavorites(userId)
      if (favoritedArtworkIds.length > 0) {
        artworks = await Promise.all(favoritedArtworkIds.map(id => d1.getArtwork(id)))
        artworks = artworks.filter(Boolean)
      }
    } else {
      // Default to feed
      artworks = await d1.listFeed(limit)
    }
    
    artworkIds = artworks.map(a => a.id)
    
    // Get user states for all artworks
    let userStates: Array<{ liked: boolean; faved: boolean }> = []
    
    if (userId && artworkIds.length > 0) {
      try {
        const [likedIds, favedIds] = await Promise.all([
          redis.listUserLikes(userId),
          d1.listUserFavorites(userId)
        ])
        
        const likedSet = new Set(likedIds)
        const favedSet = new Set(favedIds)
        
        userStates = artworkIds.map(id => ({
          liked: likedSet.has(id),
          faved: favedSet.has(id)
        }))
      } catch (e) {
        // Fallback to individual checks
        userStates = await Promise.all(
          artworkIds.map(async (id) => ({
            liked: await d1.isLikedByUser(userId, id),
            faved: await d1.isFavoritedByUser(userId, id)
          }))
        )
      }
    } else {
      userStates = artworkIds.map(() => ({ liked: false, faved: false }))
    }
    
    // Format response
    // 直接使用快照计数渲染
    const formattedArtworks = formatArtworkListForAPI(artworks, userStates)
    
    // Pagination info
    const hasMore = formattedArtworks.length === limit
    
    return c.json(ok({
      list: formattedArtworks,
      page: Number(page),
      has_more: hasMore
    }))
    
  } catch (error) {
    console.error('Error in works list:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

router.post('/', async (c) => {
  try {
    const userId = (c as any).get('userId') as string
    if (!userId) return c.json(fail('UNAUTHORIZED', 'Authentication required'), 401)
    
    const body = await c.req.json()
    const { title, prompt, model, seed, width, height } = body
    
    if (!title) return c.json(fail('INVALID_INPUT', 'Title is required'), 400)
    
    // This would typically involve file upload
    // For now, return a placeholder response
    const d1 = D1Service.fromEnv(c.env)
    const artworkId = await d1.createArtwork(userId, title, '', '', {
      prompt,
      model,
      seed,
      width,
      height
    })
    
    const artwork = await d1.getArtwork(artworkId)
    if (!artwork) return c.json(fail('NOT_FOUND', 'Artwork not found'), 404)
    
    const response = formatArtworkForAPI(artwork, { liked: false, faved: false })
    return c.json(ok(response))
    
  } catch (error) {
    console.error('Error creating artwork:', error)
    return c.json(fail('INTERNAL_ERROR', 'Internal server error'), 500)
  }
})

export default router