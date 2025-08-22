import { Button } from '@/components/ui/button';
import { CTAButton } from '@/components/ui/cta-button';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import HeroBg from './hero-bg';
import { FadeInUp, FadeInDown, FadeIn } from '@/components/ui/animated-container';

interface HeroSectionProps {
  className?: string;
}

export function HeroSection({ className }: HeroSectionProps) {
  return (
    <section className={`relative overflow-hidden bg-background ${className}`}>
      <HeroBg />
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
      
      {/* Bottom gradient transition */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
      
      {/* Gradient Orbs */}
      <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4">
        <div className="h-64 w-64 rounded-full bg-gradient-to-r from-sky-200/20 to-blue-300/20 blur-3xl" />
      </div>
      <div className="absolute left-0 bottom-0 -translate-x-1/4 translate-y-1/4">
        <div className="h-96 w-96 rounded-full bg-gradient-to-r from-emerald-200/20 to-green-300/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        {/* Announcement Banner */}
        <FadeInDown delay={100}>
          <div className="mb-8 inline-flex items-center rounded-full bg-muted px-4 py-1.5 text-sm font-medium text-foreground">
            <Sparkles className="mr-2 h-4 w-4" />
            ✨ AI 创作新时代已开启
          </div>
        </FadeInDown>

        {/* Main Content */}
        <div className="mx-auto max-w-3xl text-center">
          <FadeInUp delay={200}>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              释放你的
              <span className="bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent"> AI 创意</span>
              <br />
              构建视觉盛宴
            </h1>
          </FadeInUp>
          
          <FadeInUp delay={300}>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              用最先进的AI技术，将你的想法转化为令人惊叹的视觉艺术。加入我们的创作者社区，探索无限可能。
            </p>
          </FadeInUp>

          {/* CTA Buttons */}
          <FadeInUp delay={400}>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <CTAButton href="/feed" size="lg" variant="primary" className="btn-animate">
                开始创作
              </CTAButton>
              <CTAButton
                href="/features"
                size="lg"
                variant="secondary"
                className="btn-animate"
              >
                了解更多
              </CTAButton>
            </div>
          </FadeInUp>

          {/* Stats */}
          <FadeInUp delay={500}>
            <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-foreground">10K+</div>
                <div className="mt-1 text-sm text-muted-foreground">创作者</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">50K+</div>
                <div className="mt-1 text-sm text-muted-foreground">作品</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-foreground">100K+</div>
                <div className="mt-1 text-sm text-muted-foreground">互动</div>
              </div>
            </div>
          </FadeInUp>
        </div>

                {/* Hero Image */}
        <FadeInUp delay={600}>
          <div className="mx-auto mt-16 max-w-4xl">
            <div className="relative rounded-2xl bg-card p-2 shadow-2xl backdrop-blur-sm card-gradient-shadow">
              <div className="aspect-[16/9] overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="flex h-full items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-r from-gray-600 to-gray-800 p-4">
                      <Sparkles className="h-full w-full text-white" />
                    </div>
                    <p className="text-lg font-medium text-foreground/80">
                      AI 创作平台
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}