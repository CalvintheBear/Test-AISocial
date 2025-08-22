import { Button } from '@/components/ui/button';
import { CTAButton } from '@/components/ui/cta-button';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';
import { FadeInUp, FadeInDown } from '@/components/ui/animated-container';

interface CTASectionProps {
  className?: string;
}

export function CTASection({ className }: CTASectionProps) {
  return (
    <section className={`relative isolate overflow-hidden ${className}`}>
      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <FadeInDown delay={100}>
            <div className="flex justify-center mb-4">
              <Sparkles className="h-12 w-12 text-primary" />
            </div>
          </FadeInDown>
          <FadeInUp delay={200}>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              准备好开始你的AI创作之旅了吗？
            </h2>
          </FadeInUp>
          <FadeInUp delay={300}>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              加入我们的创作者社区，用AI释放你的创意潜能。
              现在注册，立即开始创作属于你自己的艺术作品。
            </p>
          </FadeInUp>
          <FadeInUp delay={400}>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <CTAButton href="/feed" size="lg" variant="primary" className="btn-animate">
                立即开始创作
              </CTAButton>
              <CTAButton
                href="/features"
                size="lg"
                variant="secondary"
                className="btn-animate"
              >
                了解更多功能
              </CTAButton>
            </div>
          </FadeInUp>
        </div>
      </div>
    </section>
  );
}