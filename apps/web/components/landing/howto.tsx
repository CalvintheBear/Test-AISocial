"use client";
import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { FadeInUp, FadeInLeft, FadeInRight } from '@/components/ui/animated-container';

interface StepItem {
  key: string;
  title: string;
  desc: string;
  num: string;
  image: string;
}

const steps: StepItem[] = [
  {
    key: 'start',
    title: '开始你的创作',
    desc: '上传参考图或输入文本提示，立即生成初稿。',
    num: '01',
    image: '/imgs/showcases/4.png',
  },
  {
    key: 'edit',
    title: '编辑与变换',
    desc: '使用文本指令修改图像内容，替换背景、调整风格与细节。',
    num: '02',
    image: '/imgs/showcases/5.png',
  },
  {
    key: 'iterate',
    title: '逐步迭代',
    desc: '基于上一次结果继续迭代，确保角色一致与构图优化。',
    num: '03',
    image: '/imgs/showcases/6.png',
  },
  {
    key: 'perfect',
    title: '完善与发布',
    desc: '进行精修直至达到理想效果，一键发布至社区。',
    num: '04',
    image: '/imgs/showcases/1.png',
  },
];

export function HowToSection() {
  const [active, setActive] = useState<string>(steps[1].key);

  return (
    <section className="relative py-24 sm:py-32">
      <div className="container">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          {/* Left: steps */}
          <div className="space-y-4">
            <FadeInUp delay={100}>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">如何在平台上创作</h2>
            </FadeInUp>
            <FadeInUp delay={200}>
              <p className="max-w-xl text-muted-foreground">按照以下简单步骤，快速完成从构思到发布。</p>
            </FadeInUp>

            {steps.map((st, index) => {
              const isActive = st.key === active;
              return (
                <FadeInUp key={st.key} delay={300 + index * 100}>
                  <div
                    className={cn('rounded-2xl border border-border bg-card transition-all card-gradient-shadow card-hover', isActive ? 'ring-1 ring-primary shadow-md' : 'hover:shadow')}
                  >
                    <button
                      type="button"
                      onClick={() => setActive(st.key)}
                      className="flex w-full items-start gap-4 px-5 py-4 text-left"
                    >
                      <span className={cn('grid h-10 w-10 place-items-center rounded-lg text-sm font-semibold shadow-sm text-white', 
                        isActive 
                          ? (st.num === '01' ? 'bg-gradient-to-br from-cyan-400 to-blue-500' :
                             st.num === '02' ? 'bg-gradient-to-br from-emerald-400 to-teal-500' :
                             st.num === '03' ? 'bg-gradient-to-br from-purple-400 to-pink-500' :
                             'bg-gradient-to-br from-orange-400 to-red-500')
                          : 'bg-gray-100 text-gray-600'
                      )}>{st.num}</span>
                      <div className="flex-1">
                        <div className="text-base font-medium text-foreground">{st.title}</div>
                        <div className="mt-1 text-sm leading-6 text-muted-foreground">{st.desc}</div>
                      </div>
                      <span className={cn('transition-transform', isActive ? 'rotate-180' : '')}>⌄</span>
                    </button>
                    <div className={cn('grid overflow-hidden px-5 transition-[grid-template-rows] duration-300 ease-out', isActive ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                      <div className="min-h-0 pb-5">
                        <div className="h-0.5 w-40 rounded-full bg-primary/60" />
                      </div>
                    </div>
                  </div>
                </FadeInUp>
              );
            })}
          </div>

          {/* Right: image gallery */}
          <FadeInRight delay={300}>
            <div className="relative mx-auto w-full max-w-xl">
              <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-2 shadow-xl backdrop-blur-sm card-gradient-shadow">
                <div className="relative aspect-[4/3]">
                  {steps.map((st) => {
                    const isActive = st.key === active;
                    return (
                      <Image
                        key={st.key}
                        src={st.image}
                        alt={st.title}
                        fill
                        className={cn('absolute inset-0 rounded-2xl object-cover transition-opacity duration-500 will-change-[opacity] image-hover', isActive ? 'opacity-100' : 'opacity-0')}
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


