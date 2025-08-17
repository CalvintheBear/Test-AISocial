import { ArtworkGrid } from '@/components/app/ArtworkGrid'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import { ArtworkListItem } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Image from 'next/image'

interface UserProfile {
  id: string
  name: string
  username: string
  profilePic?: string
  bio?: string
  followersCount: number
  followingCount: number
}

// Mock user data for demo
const mockUser: UserProfile = {
  id: 'user-demo',
  name: '演示用户',
  username: 'demo-user',
  profilePic: 'https://via.placeholder.com/120x120/3b74ff/ffffff?text=演',
  bio: 'AI 艺术家，探索人类创造力与人工智能之间的边界',
  followersCount: 1234,
  followingCount: 567
}

async function getUserArtworks(userId: string): Promise<ArtworkListItem[]> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') {
    return authFetch('/mocks/user-artworks.json')
  }
  return authFetch(API.userArtworks(userId))
}

async function getUserFavorites(userId: string): Promise<ArtworkListItem[]> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') {
    return authFetch('/mocks/favorites.json')
  }
  return authFetch(API.userFavorites(userId))
}

export const metadata = {
  title: '演示用户 - AI 社区',
  description: '查看演示用户的个人资料和创作作品',
  openGraph: {
    title: '演示用户 - AI 社区',
    description: '查看演示用户的个人资料和创作作品',
  },
}

export default async function UserPage({ 
  params 
}: { 
  params: { username: string } 
}) {
  const { username } = params
  
  // For demo, use mock user. In real implementation, fetch by username
  const user = mockUser
  const artworks = await getUserArtworks(user.id)
  const favorites = await getUserFavorites(user.id)

  return (
    <div className="container mx-auto px-4 py-8">
      {/* User Banner */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-64 rounded-lg mb-8 flex items-center">
        <div className="flex items-center space-x-6 px-8">
          <Image
            src={user.profilePic || 'https://via.placeholder.com/120x120/cccccc/666666?text=用户'}
            alt={user.name}
            width={120}
            height={120}
            className="rounded-full border-4 border-white"
          />
          <div className="text-white">
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <p className="text-lg opacity-90">@{user.username}</p>
            <p className="mt-2 max-w-md">{user.bio}</p>
            
            <div className="flex space-x-6 mt-4">
              <div className="text-center">
                <div className="font-bold text-2xl">{user.followersCount}</div>
                <div className="opacity-80">关注者</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-2xl">{user.followingCount}</div>
                <div className="opacity-80">关注中</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="works" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mb-8">
          <TabsTrigger value="works">我的作品</TabsTrigger>
          <TabsTrigger value="favorites">我的收藏</TabsTrigger>
        </TabsList>
        
        <TabsContent value="works">
          <ArtworkGrid artworks={artworks} />
        </TabsContent>
        
        <TabsContent value="favorites">
          <ArtworkGrid artworks={favorites} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'edge'