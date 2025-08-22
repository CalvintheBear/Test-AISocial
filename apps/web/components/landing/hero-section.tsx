import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface HeroSectionProps {
  className?: string;
}

export function HeroSection({ className }: HeroSectionProps) {
  return (
    <section className={`relative overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 ${className}`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-slate-700/20 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0))]" />
      
      {/* Gradient Orbs */}
      <div className="absolute right-0 top-0 -translate-y-1/4 translate-x-1/4">
        <div className="h-64 w-64 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl" />
      </div>
      <div className="absolute left-0 bottom-0 -translate-x-1/4 translate-y-1/4">
        <div className="h-96 w-96 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
        {/* Announcement Banner */}
        <div className="mb-8 inline-flex items-center rounded-full bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-1.5 text-sm font-medium text-purple-900 dark:from-purple-900/30 dark:to-pink-900/30 dark:text-purple-200">
          <Sparkles className="mr-2 h-4 w-4" />
          ✨ AI 创作新时代已开启
        </div>

        {/* Main Content */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
            释放你的
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> AI 创意</span>
            <br />
            构建视觉盛宴
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            用最先进的AI技术，将你的想法转化为令人惊叹的视觉艺术。加入我们的创作者社区，探索无限可能。
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button
              size="lg"
              className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 text-lg font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105"
              asChild
            >
              <Link href="/feed">
                开始创作
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 py-3 text-lg font-semibold"
              asChild
            >
              <Link href="/features">了解更多</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">10K+</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">创作者</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">50K+</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">作品</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">100K+</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">互动</div>
            </div>
          </div>
        </div>

        {/* Hero Image */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="relative rounded-2xl bg-white/50 p-2 shadow-2xl backdrop-blur-sm dark:bg-slate-900/50">
            <div className="aspect-[16/9] overflow-hidden rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20">
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-4">
                    <Sparkles className="h-full w-full text-white" />
                  </div>
                  <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                    AI 创作平台
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}