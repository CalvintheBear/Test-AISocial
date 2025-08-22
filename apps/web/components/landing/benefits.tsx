"use client";
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Repeat, Wand2 } from 'lucide-react';
import { FadeInUp, FadeInLeft, FadeInRight } from '@/components/ui/animated-container';

interface BenefitItem {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
}

const items: BenefitItem[] = [
  {
    key: 'performance',
    title: '更快的推理与更高质量',
    description:
      '我们提供更快的生成速度与稳定的质量表现，具备一致的角色与更好的上下文理解。',
    icon: <Sparkles className="h-5 w-5 text-foreground opacity-80" />,
    image: '/imgs/showcases/1.png',
  },
  {
    key: 'iteration',
    title: '迭代编辑能力',
    description:
      '通过逐步编辑与对比，你可以在保持人物一致性的前提下快速迭代作品。',
    icon: <Repeat className="h-5 w-5 text-foreground opacity-80" />,
    image: '/imgs/showcases/2.png',
  },
  {
    key: 'style',
    title: '风格参考创新',
    description:
      '支持参考图片风格迁移与组合，轻松创造符合你品牌调性的视觉语言。',
    icon: <Wand2 className="h-5 w-5 text-foreground opacity-80" />,
    image: '/imgs/showcases/3.png',
  },
];

export function BenefitsSection() {
  const [active, setActive] = useState<string>(items[0].key);

  return (
    <section className="relative py-24 sm:py-32">
      <div className="container">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          {/* Left: text & accordion */}
          <div>
            <FadeInUp delay={100}>
              <div className="mb-8 inline-flex rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-700 font-medium">Benefits</div>
            </FadeInUp>
            <FadeInUp delay={200}>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">为什么选择我们的平台</h2>
            </FadeInUp>
            <FadeInUp delay={300}>
              <p className="mt-4 max-w-xl text-muted-foreground">
                体验新一代 AI 图像编辑能力，在一致性、理解力与生成速度上全面领先。
              </p>
            </FadeInUp>

            <div className="mt-8 space-y-4">
              {items.map((it, index) => {
                const isActive = it.key === active;
                return (
                  <FadeInUp key={it.key} delay={400 + index * 100}>
                    <div
                      className={cn(
                        'rounded-2xl border border-border bg-card transition-all card-gradient-shadow card-hover',
                        isActive ? 'ring-1 ring-primary shadow-md' : 'hover:shadow'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setActive(isActive ? it.key : it.key)}
                        className="flex w-full items-center gap-3 px-5 py-4 text-left"
                      >
                        <span className={cn('grid h-9 w-9 place-items-center rounded-full shadow-sm', 
                          isActive 
                            ? (it.key === 'performance' ? 'bg-gradient-to-br from-cyan-400/20 to-blue-500/20' :
                               it.key === 'iteration' ? 'bg-gradient-to-br from-emerald-400/20 to-teal-500/20' :
                               'bg-gradient-to-br from-purple-400/20 to-pink-500/20')
                            : 'bg-gray-100 text-gray-600'
                        )}>
                          {it.icon}
                        </span>
                        <span className="flex-1 text-base font-medium text-foreground">{it.title}</span>
                        <span className={cn('transition-transform', isActive ? 'rotate-180' : '')}>⌄</span>
                      </button>
                      <div
                        className={cn(
                          'grid overflow-hidden px-5 transition-[grid-template-rows] duration-300 ease-out',
                          isActive ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                        )}
                      >
                        <div className="min-h-0 pb-5 text-sm leading-6 text-muted-foreground">
                          {it.description}
                          <div className="mt-3 h-0.5 w-40 rounded-full bg-primary/60" />
                        </div>
                      </div>
                    </div>
                  </FadeInUp>
                );
              })}
            </div>
          </div>

          {/* Right: image gallery with cross-fade */}
          <FadeInRight delay={300}>
            <div className="relative mx-auto w-full max-w-xl">
              <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-2 shadow-xl backdrop-blur-sm card-gradient-shadow">
                <div className="relative aspect-[4/3]">
                  {items.map((it) => {
                    const isActive = it.key === active;
                    return (
                      <Image
                        key={it.key}
                        src={it.image}
                        alt={it.title}
                        fill
                        className={cn(
                          'absolute inset-0 object-cover transition-opacity duration-500 will-change-[opacity] rounded-2xl image-hover',
                          isActive ? 'opacity-100' : 'opacity-0'
                        )}
                        sizes="(max-width: 1024px) 100vw, 640px"
                        priority={isActive}
                      />
                    );
                  })}
                </div>
                <div className="pointer-events-none absolute -inset-2 rounded-[28px] bg-primary/10 blur-2xl" />
              </div>
            </div>
          </FadeInRight>
        </div>
      </div>
    </section>
  );
}


