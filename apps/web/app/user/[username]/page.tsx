import UserProfileClient from './UserProfileClient'

export const metadata = {
  title: '用户主页 - AI 社区',
  description: '查看个人资料和创作作品',
  openGraph: {
    title: '用户主页 - AI 社区',
    description: '查看个人资料和创作作品',
  },
}

export default async function UserPage({ params }: { params: { username: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <UserProfileClient username={params.username} />
    </div>
  )
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'edge'