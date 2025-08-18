import HotnessDebugger from '@/components/HotnessDebugger'

export const metadata = {
  title: '热度调试 - AI 社区',
  description: '查看作品热度详情和排行榜信息',
}

export default function DebugPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <HotnessDebugger />
    </main>
  )
}