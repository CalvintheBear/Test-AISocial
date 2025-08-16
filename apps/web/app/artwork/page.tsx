"use client"
import { CreateArtworkPanel } from '@/components/app/CreateArtworkPanel'
import { Card } from '@/components/ui'
import Link from 'next/link'

export default function ArtworkWorkbenchPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">工作台</h1>
        <p className="text-gray-600">在这里生成或上传你的作品，并保存为草稿或发布</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CreateArtworkPanel />
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-2">指引</h3>
            <ul className="text-sm text-gray-600 list-disc pl-4 space-y-1">
              <li>输入提示词生成作品，或上传图片进行创作</li>
              <li>生成后可先保存为草稿，满意后再发布</li>
              <li>发布成功后会出现在你的主页与推荐 Feed</li>
            </ul>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-2">快速入口</h3>
            <div className="flex flex-col gap-2">
              <Link href="/user/demo" className="text-blue-600 hover:underline text-sm">我的主页</Link>
              <Link href="/feed" className="text-blue-600 hover:underline text-sm">发现作品</Link>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}


