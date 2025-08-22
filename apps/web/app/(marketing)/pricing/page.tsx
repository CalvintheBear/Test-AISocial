import { Metadata } from 'next'
import PricingClient from './PricingClient'

export const metadata: Metadata = {
  title: '定价 - AI Social',
  description: '购买积分，解锁更强大的 AI 生成能力',
}

export default function PricingPage() {
  return (
    <main className="min-h-screen pt-16 page-bg">
      <PricingClient />
    </main>
  )
}


