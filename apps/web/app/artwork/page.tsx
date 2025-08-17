"use client"
import { CreateArtworkPanel } from '@/components/app/CreateArtworkPanel'
import { Card } from '@/components/ui'
import Link from 'next/link'

export default function ArtworkPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">工作台（占位）</h1>
      <p className="mb-4">这里将是生成/上传入口。</p>
      <Link href="/user/me" className="text-blue-600 hover:underline text-sm">我的主页</Link>
    </div>
  )
}


