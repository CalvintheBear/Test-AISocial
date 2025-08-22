"use client"
import { CreateArtworkPanel } from '@/components/app/CreateArtworkPanel'

export default function ArtworkPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">工作台</h1>
        <CreateArtworkPanel />
      </div>
    </div>
  )
}


