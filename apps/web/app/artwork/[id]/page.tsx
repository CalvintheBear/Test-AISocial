import { redirect } from 'next/navigation'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'

export default async function ArtworkRedirectPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const { id } = params
  
  try {
    // Fetch artwork details to get the slug
    const artwork = await authFetch(API.artwork(id))
    
    if (!artwork || !artwork.id) {
      // Handle 404 case
      return (
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold mb-2">作品不存在或无访问权限</h1>
          <p className="text-gray-600 mb-6">可能已被删除、未发布或你没有权限查看。</p>
        </div>
      )
    }
    
    // Generate slug from title if not provided
    const slug = artwork.slug || artwork.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .trim() || 'untitled'
    
    // Redirect to the correct URL format
    redirect(`/artwork/${id}/${slug}`)
    
  } catch (error) {
    // Handle any errors
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-2">作品加载失败</h1>
        <p className="text-gray-600 mb-6">无法加载作品信息，请稍后重试。</p>
      </div>
    )
  }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'edge'