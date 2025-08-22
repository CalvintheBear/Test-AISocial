import UserProfileClient from './UserProfileClient'
import { API } from '@/lib/api/endpoints'
import { AnimatedContainer } from '@/components/ui/animated-container'

export const metadata = {
  title: '用户主页 - AI 社区',
  description: '查看个人资料和创作作品',
  openGraph: {
    title: '用户主页 - AI 社区',
    description: '查看个人资料和创作作品',
  },
}

export const revalidate = 60
export const runtime = 'edge'

export default async function UserPage({ params }: { params: { username: string } }) {
  const username = params.username
  let initialProfile: any = null
  let initialArtworks: any[] | undefined = undefined

  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8787'
    // username 可能为用户ID或 'me'；仅对非 me 进行服务器端公共预取
    if (username && username !== 'me') {
      const [profileRes, artsRes] = await Promise.all([
        fetch(`${API_BASE}${API.userProfile(username)}`, { next: { revalidate: 60 } }),
        fetch(`${API_BASE}${API.userArtworks(username)}`, { next: { revalidate: 60 } }),
      ])
      const profileJson = await profileRes.json().catch(() => null)
      const artsJson = await artsRes.json().catch(() => null)
      initialProfile = profileJson?.data ?? profileJson ?? null
      initialArtworks = Array.isArray(artsJson?.data) ? artsJson.data : (Array.isArray(artsJson) ? artsJson : [])
    }
  } catch {}

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <AnimatedContainer trigger="onMount" animation="fade-in-up" delay={100}>
          <UserProfileClient username={username} initialProfile={initialProfile} initialArtworks={initialArtworks} />
        </AnimatedContainer>
      </div>
    </div>
  )
}