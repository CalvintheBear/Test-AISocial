import { Metadata } from 'next'
import { HeroSection } from '@/components/landing/hero-section'
import { ShowcaseSection } from '@/components/landing/showcase'
import { FAQSection } from '@/components/landing/faq'
import { FeaturesGrid } from '@/components/landing/features-grid'
import { BenefitsSection } from '@/components/landing/benefits'
import { HowToSection } from '@/components/landing/howto'
import { TestimonialsSection } from '@/components/landing/testimonials'
import { StatsSection } from '@/components/landing/stats'
import { CTASection } from '@/components/landing/cta-section'
import { PricingPreviewSection } from '@/components/landing/pricing-preview'
import { Footer } from '@/components/landing/footer'
import { FadeInUp, AnimatedContainer } from '@/components/ui/animated-container'

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
    <main className="min-h-screen page-bg">
      <AnimatedContainer trigger="onMount" animation="fade-in" delay={0}>
        <HeroSection />
      </AnimatedContainer>
      
      <AnimatedContainer trigger="onScroll" animation="fade-in-up" delay={100}>
        <div className="with-mask section-gradient -mt-16">
          <FeaturesGrid />
        </div>
      </AnimatedContainer>
      
      <AnimatedContainer trigger="onScroll" animation="fade-in-up" delay={200}>
        <div className="with-mask section-gradient -mt-8">
          <BenefitsSection />
        </div>
      </AnimatedContainer>
      
      <AnimatedContainer trigger="onScroll" animation="fade-in-up" delay={100}>
        <div className="with-mask section-gradient -mt-8">
          <HowToSection />
        </div>
      </AnimatedContainer>
      
      <AnimatedContainer trigger="onScroll" animation="fade-in-up" delay={200}>
        <div className="with-mask section-gradient -mt-8">
          <ShowcaseSection />
        </div>
      </AnimatedContainer>
      
      <AnimatedContainer trigger="onScroll" animation="fade-in-up" delay={100}>
        <div className="with-mask section-gradient -mt-8">
          <StatsSection />
        </div>
      </AnimatedContainer>
      
      <AnimatedContainer trigger="onScroll" animation="fade-in-up" delay={200}>
        <div className="with-mask section-gradient -mt-8">
          <PricingPreviewSection />
        </div>
      </AnimatedContainer>
      
      <AnimatedContainer trigger="onScroll" animation="fade-in-up" delay={100}>
        <div className="with-mask section-gradient -mt-8">
          <TestimonialsSection />
        </div>
      </AnimatedContainer>
      
      <AnimatedContainer trigger="onScroll" animation="fade-in-up" delay={200}>
        <div className="with-mask section-gradient -mt-8">
          <FAQSection />
        </div>
      </AnimatedContainer>
      
      <AnimatedContainer trigger="onScroll" animation="fade-in-up" delay={100}>
        <CTASection />
      </AnimatedContainer>
      
      <AnimatedContainer trigger="onScroll" animation="fade-in-up" delay={200}>
        <Footer />
      </AnimatedContainer>
    </main>
  )
}


