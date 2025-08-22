import { Button } from '@/components/ui'
import { Metadata } from 'next'
import Link from 'next/link'
import { FeaturesGrid } from '@/components/landing/features-grid'
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
      <section className="relative overflow-hidden bg-background py-20 md:py-32">
        <div className="absolute inset-0 pointer-events-none [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl"
            >
              探索我们强大的
              <br />
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">AI创作功能</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground"
            >
              从一个简单的想法到一件惊艳的艺术品，我们提供全流程创作工具。
              让AI成为你创意表达的强大助力。
            </p>
          </div>
        </div>
      </section>

      <FeaturesGrid />

      {/* Detailed Features */}
      <section className="py-24 sm:py-32 bg-muted">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16"
          >
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
            >
              深入了解每个功能
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground"
            >
              我们提供了一套完整的AI创作工具，让每个人都能成为艺术家。
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <div className="space-y-16">
              {/* 文生图 */}
              <div className="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-2">
                <div className="lg:pr-8">
                  <div className="lg:max-w-lg">
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">
                      文生图 - 文字转艺术
                    </h3>
                    <p className="mt-4 text-lg text-muted-foreground">
                      将你的想法用文字描述，AI即刻为你生成独特的艺术作品。
                      支持中文提示词，理解复杂场景描述。
                    </p>
                    <ul role="list" className="mt-8 space-y-4 text-muted-foreground">
                      <li className="flex gap-x-3">
                        <span className="text-purple-600">✓</span>
                        <span>支持多种艺术风格：写实、插画、动漫、水墨等</span>
                      </li>
                      <li className="flex gap-x-3">
                        <span className="text-purple-600">✓</span>
                        <span>高清输出，最高支持4K分辨率</span>
                      </li>
                      <li className="flex gap-x-3">
                        <span className="text-purple-600">✓</span>
                        <span>实时预览，支持多次迭代优化</span>
                      </li>
                      <li className="flex gap-x-3">
                        <span className="text-purple-600">✓</span>
                        <span>保存历史记录，方便回溯</span>
                      </li>
                    </ul>
                    <div className="mt-8">
                      <Button className="bg-gradient-to-r from-purple-600 to-pink-600" asChild>
                        <Link href="/feed">立即体验</Link>
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="relative rounded-2xl bg-gradient-to-r from-purple-100 to-pink-100 p-2 shadow-lg">
                    <div className="aspect-[16/10] w-full rounded-xl bg-card p-6">
                      <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-4">
                            <span className="text-2xl text-white">🎨</span>
                          </div>
                          <p className="text-lg font-medium text-foreground/80">
                            AI艺术生成演示
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 图生图 */}
              <div className="grid grid-cols-1 gap-x-8 gap-y-16 lg:grid-cols-2">
                <div className="flex items-center justify-center lg:order-2">
                  <div className="relative rounded-2xl bg-gradient-to-r from-blue-100 to-cyan-100 p-2 shadow-lg">
                    <div className="aspect-[16/10] w-full rounded-xl bg-card p-6">
                      <div className="flex h-full items-center justify-center">
                        <div className="text-center">
                          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 p-4">
                            <span className="text-2xl text-white">🔄</span>
                          </div>
                          <p className="text-lg font-medium text-foreground/80">
                            图像转换演示
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:pl-8 lg:order-1">
                  <div className="lg:max-w-lg">
                    <h3 className="text-2xl font-bold tracking-tight text-foreground">
                      图生图 - 图像转换增强
                    </h3>
                    <p className="mt-4 text-lg text-muted-foreground">
                      上传现有图像，使用AI进行风格转换、内容增强、
                      背景替换等高级编辑操作。
                    </p>
                    <ul role="list" className="mt-8 space-y-4 text-muted-foreground">
                      <li className="flex gap-x-3">
                        <span className="text-blue-600">✓</span>
                        <span>风格迁移和图像增强</span>
                      </li>
                      <li className="flex gap-x-3">
                        <span className="text-blue-600">✓</span>
                        <span>物体移除和智能填充</span>
                      </li>
                      <li className="flex gap-x-3">
                        <span className="text-blue-600">✓</span>
                        <span>背景替换和场景转换</span>
                      </li>
                      <li className="flex gap-x-3">
                        <span className="text-blue-600">✓</span>
                        <span>图像放大和清晰度增强</span>
                      </li>
                    </ul>
                    <div className="mt-8">
                      <Button className="bg-gradient-to-r from-blue-600 to-cyan-600" asChild>
                        <Link href="/feed">开始创作</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TestimonialsSection />
      <Footer />
    </main>
  )
}


