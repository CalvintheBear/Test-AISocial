import { Metadata } from 'next'
import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesGrid } from '@/components/landing/features-grid'
import { TestimonialsSection } from '@/components/landing/testimonials'
import { StatsSection } from '@/components/landing/stats'
import { CTASection } from '@/components/landing/cta-section'
import { Footer } from '@/components/landing/footer'

export const metadata: Metadata = {
  title: 'AI Social - 生成最潮的AI艺术作品',
  description: '只需一句话，即刻拥有属于你的AIGC杰作。免费、快速、无限创意。加入AI创作社区，释放你的创造力。',
  keywords: ['AI艺术', 'AI绘画', 'AI创作', '文本生图', 'AI社区', '人工智能艺术'],
  openGraph: {
    title: 'AI Social - 生成最潮的AI艺术作品',
    description: '只需一句话，即刻拥有属于你的AIGC杰作。免费、快速、无限创意。',
    type: 'website',
    images: ['/og-home.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Social - 生成最潮的AI艺术作品',
    description: '只需一句话，即刻拥有属于你的AIGC杰作。免费、快速、无限创意。',
    images: ['/og-home.jpg'],
  },
}

export default function MarketingHomePage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <FeaturesGrid />
      <StatsSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </main>
  )
}


