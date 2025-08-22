import { Button } from '@/components/ui'
import { CTAButton } from '@/components/ui/cta-button'
import { AnimatedContainer, FadeInUp, AnimatedList } from '@/components/ui/animated-container'
import { Metadata } from 'next'
import Link from 'next/link'
import { FeaturesGrid } from '@/components/landing/features-grid'
import { BenefitsSection } from '@/components/landing/benefits'
import { HowToSection } from '@/components/landing/howto'
import { TestimonialsSection } from '@/components/landing/testimonials'
import { Footer } from '@/components/landing/footer'

export const metadata: Metadata = {
  title: '功能介绍 - AI Social | 强大的AI创作工具',
  description: '探索文生图、图生图、从草稿到发布、发现点赞收藏等强大AI功能，释放你的创造力。',
  keywords: ['AI功能', '文生图', '图生图', 'AI创作工具', '艺术生成', '社区分享'],
  openGraph: {
    title: '功能介绍 - AI Social | 强大的AI创作工具',
    description: '探索文生图、图生图、从草稿到发布、发现点赞收藏等强大AI功能',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '功能介绍 - AI Social | 强大的AI创作工具',
    description: '探索文生图、图生图、从草稿到发布、发现点赞收藏等强大AI功能',
  },
}

export const dynamic = 'force-static'

export default function FeaturesPage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background py-20 md:py-32 page-bg container-gradient-shadow">
        <div className="absolute inset-0 pointer-events-none [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <FadeInUp delay={100} duration={800}>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl"
              >
                探索我们强大的
                <br />
                <span className="bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">AI创作功能</span>
              </h1>
            </FadeInUp>
            <FadeInUp delay={300} duration={800}>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground"
              >
                从一个简单的想法到一件惊艳的艺术品，我们提供全流程创作工具。
                让AI成为你创意表达的强大助力。
              </p>
            </FadeInUp>
          </div>
        </div>
      </section>

      <div className="with-mask section-gradient">
        <AnimatedContainer delay={200} duration={800} trigger="onScroll">
          <FeaturesGrid />
        </AnimatedContainer>
      </div>
      <AnimatedContainer delay={300} duration={800} trigger="onScroll">
        <BenefitsSection />
      </AnimatedContainer>
      <AnimatedContainer delay={400} duration={800} trigger="onScroll">
        <HowToSection />
      </AnimatedContainer>

      {/* Detailed Features */}
      <section className="py-24 sm:py-32 bg-muted with-mask section-gradient container-gradient-shadow">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16"
          >
            <FadeInUp delay={100} duration={800} trigger="onScroll">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
              >
                深入了解每个功能
              </h2>
            </FadeInUp>
            <FadeInUp delay={200} duration={800} trigger="onScroll">
              <p className="mt-6 text-lg leading-8 text-muted-foreground"
              >
                我们提供了一套完整的AI创作工具，让每个人都能成为艺术家。
              </p>
            </FadeInUp>
          </div>

          <div className="mx-auto mt-16 max-w-7xl sm:mt-20 lg:mt-24">
            <div className="space-y-24">
              {/* 第一排: 文生图 - 左文右图 */}
              <div className="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-2 lg:items-center">
                <AnimatedContainer delay={300} duration={800} trigger="onScroll" className="lg:pr-8">
                  <h3 className="text-3xl font-bold tracking-tight text-foreground">
                    文生图 - 文字转艺术
                  </h3>
                  <p className="mt-6 text-lg leading-8 text-muted-foreground">
                    将你的想法用文字描述，AI即刻为你生成独特的艺术作品。
                    支持中文提示词，理解复杂场景描述。
                  </p>
                  <div className="mt-8">
                    <CTAButton href="/artwork" size="md" variant="primary">
                      立即体验
                    </CTAButton>
                  </div>
                </AnimatedContainer>
                <AnimatedContainer delay={400} duration={800} trigger="onScroll" className="relative">
                                     <img
                     src="/imgs/showcases/1.png"
                     alt="文生图示例"
                     className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl"
                   />
                </AnimatedContainer>
              </div>

              {/* 第二排: 图生图 - 左图右文 */}
              <div className="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-2 lg:items-center">
                <AnimatedContainer delay={500} duration={800} trigger="onScroll" className="relative">
                                     <img
                     src="/imgs/showcases/2.png"
                     alt="图生图示例"
                     className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl"
                   />
                </AnimatedContainer>
                <AnimatedContainer delay={600} duration={800} trigger="onScroll" className="lg:pl-8">
                  <h3 className="text-3xl font-bold tracking-tight text-foreground">
                    图生图 - 图像转换增强
                  </h3>
                  <p className="mt-6 text-lg leading-8 text-muted-foreground">
                    上传现有图像，使用AI进行风格转换、内容增强、
                    背景替换等高级编辑操作。
                  </p>
                  <div className="mt-8">
                    <CTAButton href="/artwork" size="md" variant="primary">
                      开始创作
                    </CTAButton>
                  </div>
                </AnimatedContainer>
              </div>

              {/* 第三排: 实时世界生成 - 左文右图 */}
              <div className="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-2 lg:items-center">
                <AnimatedContainer delay={700} duration={800} trigger="onScroll" className="lg:pr-8">
                  <h3 className="text-3xl font-bold tracking-tight text-foreground">
                    实时世界生成
                  </h3>
                  <p className="mt-6 text-lg leading-8 text-muted-foreground">
                    Genie 3 generates interactive environments at 24 FPS from text prompts.
                    Experience dynamic worlds with consistent physics, natural lighting, and
                    promptable world events for real-time modifications.
                  </p>
                  <div className="mt-8">
                    <CTAButton href="/artwork" size="md" variant="primary">
                      探索世界
                    </CTAButton>
                  </div>
                </AnimatedContainer>
                <AnimatedContainer delay={800} duration={800} trigger="onScroll" className="relative">
                                     <img
                     src="/imgs/showcases/3.png"
                     alt="实时世界生成示例"
                     className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl"
                   />
                </AnimatedContainer>
              </div>

              {/* 第四排: 视觉记忆与一致性 - 左图右文 */}
              <div className="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-2 lg:items-center">
                <AnimatedContainer delay={900} duration={800} trigger="onScroll" className="relative">
                                     <img
                     src="/imgs/showcases/4.png"
                     alt="视觉记忆与一致性示例"
                     className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl"
                   />
                </AnimatedContainer>
                <AnimatedContainer delay={1000} duration={800} trigger="onScroll" className="lg:pl-8">
                  <h3 className="text-3xl font-bold tracking-tight text-foreground">
                    视觉记忆与一致性
                  </h3>
                  <p className="mt-6 text-lg leading-8 text-muted-foreground">
                    Genie 3 maintains visual memory extending up to one minute, ensuring
                    consistent environments. Auto-regressive frame generation creates
                    coherent worlds that remember previously generated areas.
                  </p>
                  <div className="mt-8">
                    <CTAButton href="/artwork" size="md" variant="primary">
                      了解更多
                    </CTAButton>
                  </div>
                </AnimatedContainer>
              </div>

              {/* 第五排: 智能创作社区 - 左文右图 */}
              <div className="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-2 lg:items-center">
                <AnimatedContainer delay={1100} duration={800} trigger="onScroll" className="lg:pr-8">
                  <h3 className="text-3xl font-bold tracking-tight text-foreground">
                    智能创作社区
                  </h3>
                  <p className="mt-6 text-lg leading-8 text-muted-foreground">
                    与全球创作者分享你的作品，获得灵感和反馈。
                    AI推荐系统帮你发现感兴趣的内容和志同道合的创作者。
                  </p>
                  <div className="mt-8">
                    <CTAButton href="/feed" size="md" variant="primary">
                      加入社区
                    </CTAButton>
                  </div>
                </AnimatedContainer>
                <AnimatedContainer delay={1200} duration={800} trigger="onScroll" className="relative">
                                     <img
                     src="/imgs/showcases/5.png"
                     alt="智能创作社区示例"
                     className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl"
                   />
                </AnimatedContainer>
              </div>

              {/* 第六排: 版权保护与商业化 - 左图右文 */}
              <div className="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-2 lg:items-center">
                <AnimatedContainer delay={1300} duration={800} trigger="onScroll" className="relative">
                                     <img
                     src="/imgs/showcases/6.png"
                     alt="版权保护与商业化示例"
                     className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl"
                   />
                </AnimatedContainer>
                <AnimatedContainer delay={1400} duration={800} trigger="onScroll" className="lg:pl-8">
                  <h3 className="text-3xl font-bold tracking-tight text-foreground">
                    版权保护与商业化
                  </h3>
                  <p className="mt-6 text-lg leading-8 text-muted-foreground">
                    完整的版权保护机制，支持NFT铸造和商业授权。
                    让你的创作不仅是艺术品，更是有价值的数字资产。
                  </p>
                  <div className="mt-8">
                    <CTAButton href="/pricing" size="md" variant="primary">
                      了解定价
                    </CTAButton>
                  </div>
                </AnimatedContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AnimatedContainer delay={500} duration={800} trigger="onScroll">
        <TestimonialsSection />
      </AnimatedContainer>
      <AnimatedContainer delay={600} duration={800} trigger="onScroll">
        <Footer />
      </AnimatedContainer>
    </main>
  )
}


