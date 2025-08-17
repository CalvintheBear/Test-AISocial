import { ArtworkGrid } from '@/components/app/ArtworkGrid'
import { authFetch } from '@/lib/api/client'
import { API } from '@/lib/api/endpoints'
import { ArtworkListItem } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Image from 'next/image'
import { SignedIn, SignedOut } from '@clerk/nextjs'

interface UserProfile {
  id: string
  name: string
  username: string
  profilePic?: string
  email?: string
  createdAt?: number
  updatedAt?: number
}

async function getCurrentUser(): Promise<UserProfile | null> {
  if (process.env.NEXT_PUBLIC_USE_MOCK === '1') {
    return {
      id: 'user-demo',
      name: '演示用户',
      username: 'demo-user',
      profilePic: 'https://via.placeholder.com/120x120/3b74ff/ffffff?text=演',
    }
  }
  try {
    return await authFetch('/api/users/me')
  } catch {
    return null
  }
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
  title: '我的主页 - AI 社区',
  description: '查看您的个人资料和创作作品',
  openGraph: {
    title: '我的主页 - AI 社区',
    description: '查看您的个人资料和创作作品',
  },
}

export default async function UserPage({ 
  params 
}: { 
  params: { username: string } 
}) {
  const user = await getCurrentUser()
  
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">请先登录</h1>
          <p className="text-gray-600">需要登录才能查看个人资料</p>
        </div>
      </div>
    )
  }
  
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
            <p className="text-lg opacity-90">{user.email}</p>
            
            <div className="flex space-x-6 mt-4">
              <div className="text-center">
                <div className="font-bold text-2xl">{artworks.length}</div>
                <div className="opacity-80">作品</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-2xl">{favorites.length}</div>
                <div className="opacity-80">收藏</div>
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