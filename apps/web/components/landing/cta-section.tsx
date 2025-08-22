import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface CTASectionProps {
  className?: string;
}

export function CTASection({ className }: CTASectionProps) {
  return (
    <section className={`relative isolate overflow-hidden bg-primary ${className}`}>
      <div className="absolute inset-0 -z-10 bg-primary/10 [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />

      <div className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="flex justify-center mb-4">
            <Sparkles className="h-12 w-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            准备好开始你的AI创作之旅了吗？
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary-foreground/80">
            加入我们的创作者社区，用AI释放你的创意潜能。
            现在注册，立即开始创作属于你自己的艺术作品。
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button
              size="lg"
              className="rounded-full bg-primary-foreground px-8 py-3 text-lg font-semibold text-primary shadow-lg transition-all hover:bg-white hover:shadow-xl"
              asChild
            >
              <Link href="/feed">
                立即开始创作
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-primary-foreground px-8 py-3 text-lg font-semibold text-primary-foreground transition-all hover:bg-primary-foreground hover:text-primary"
              asChild
            >
              <Link href="/features">了解更多功能</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Background decoration */}
      <div
        className="cta-clip-bg absolute left-1/2 top-0 -z-10 -translate-x-1/2 blur-3xl xl:-top-6"
        aria-hidden="true"
      >
        <div className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-white/20 to-white/10 opacity-30" />
      </div>
    </section>
  );
}