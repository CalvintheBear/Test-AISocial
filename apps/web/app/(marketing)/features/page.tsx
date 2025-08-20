import { Card, Button } from '@/components/ui'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

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
    <main className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="py-20 bg-grid">
        <div className="container text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6"
          >
            <span className="text-gradient">探索我们强大的AI创作功能</span>
          </h1>
          <p className="text-lg md:text-xl text-text-2 max-w-3xl mx-auto"
          >
            从一个简单的想法到一件惊艳的艺术品，我们提供全流程创作工具。
            让AI成为你创意表达的强大助力。
          </p>
        </div>
      </section>

      {/* Text to Image & Image to Image Section */}
      <section className="py-20 bg-surface">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">文生图 & 图生图</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold">将文字转化为艺术</h3>
              <ul className="space-y-3 text-text-2"
              >
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">✓</span>
                  <span>强大的自然语言处理，精准理解中文提示词</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">✓</span>
                  <span>多种艺术风格和流派自由选择</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">✓</span>
                  <span>高清输出，最高支持4K分辨率</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">✓</span>
                  <span>实时生成预览，所见即所得</span>
                </li>
              </ul>
              <Link href="#"
              >
                <Button className="bg-primary-500 hover:bg-primary-600"
                >
                  体验文生图
                </Button>
              </Link>
            </div>
            <div className="bg-gradient-to-br from-primary-100 to-primary-200 h-64 rounded-lg flex items-center justify-center shadow-lg"
            >
              <div className="text-center p-6"
              >
                <div className="w-32 h-32 bg-surface rounded-lg mx-auto mb-4 flex items-center justify-center shadow-md"
                >
                  <span className="text-4xl">🎨</span>
                </div>
                <p className="font-medium text-text">AI生成艺术作品预览</p>
                <p className="text-sm text-text-2">对应API: POST /api/artworks/generate</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mt-16"
          >
            <div className="order-2 lg:order-1 bg-gradient-to-br from-accent-100 to-accent-200 h-64 rounded-lg flex items-center justify-center shadow-lg"
            >
              <div className="text-center p-6"
              >
                <div className="w-32 h-32 bg-surface rounded-lg mx-auto mb-4 flex items-center justify-center shadow-md"
                >
                  <span className="text-4xl">🔄</span>
                </div>
                <p className="font-medium text-text">图像转换效果预览</p>
                <p className="text-sm text-text-2">对应API: POST /api/artworks/upload</p>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-6">
              <h3 className="text-2xl font-semibold">用AI转换图像</h3>
              <ul className="space-y-3 text-text-2"
              >
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">✓</span>
                  <span>风格迁移和图像增强</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">✓</span>
                  <span>物体移除和添加</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">✓</span>
                  <span>背景替换和场景转换</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary-500 mr-2 mt-1">✓</span>
                  <span>图像放大和清晰度增强</span>
                </li>
              </ul>
              <Link href="#"
              >
                <Button className="bg-primary-500 hover:bg-primary-600"
                >
                  体验图生图
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* From Draft to Publish Section */}
      <section className="py-20 bg-grid">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">从草稿到发布</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              {
                title: "创作",
                description: "从AI生成的艺术作品开始，或上传你自己的创作",
                icon: "🎨",
                api: "POST /api/artworks/generate"
              },
              {
                title: "完善",
                description: "使用我们的编辑工具完善你的艺术作品",
                icon: "✏️",
                api: "status: draft"
              },
              {
                title: "发布",
                description: "一键将你的杰作分享到社区",
                icon: "🚀",
                api: "POST /api/artworks/:id/publish"
              }
            ].map((step, index) => (
              <Card key={index} className="p-6 text-center shadow-lg"
              >
                <div className="text-4xl mb-4">{step.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-text-2 mb-2">{step.description}</p>
                <p className="text-xs text-primary-600 font-mono">{step.api}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Discover, Like, Collect Section */}
      <section className="py-20 bg-surface">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">发现、点赞与收藏</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            <div className="space-y-6">
              <h3 className="text-2xl font-semibold">探索惊人的艺术作品</h3>
              <p className="text-text-2">
                发现来自全球创作者的精彩AI生成艺术作品。
                按风格、主题或热度浏览，为你的下一个创作寻找灵感。
              </p>
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="text-primary-500 mr-3">❤️</span>
                  <span className="text-text-2">为你喜欢的作品点赞并收藏</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary-500 mr-3">🔖</span>
                  <span className="text-text-2">保存收藏夹以便日后回顾</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary-500 mr-3">💬</span>
                  <span className="text-text-2">与创作者和社区互动</span>
                </div>
              </div>
              <div className="space-y-2 text-sm text-text-2"
              >
                <p>• GET /api/feed - 获取推荐作品</p>
                <p>• POST /api/artworks/:id/like - 点赞作品</p>
                <p>• POST /api/artworks/:id/favorite - 收藏作品</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4"
            >
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="aspect-square flex items-center justify-center shadow-md"
                >
                  <div className="text-center p-4"
                  >
                    <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg mx-auto mb-2 flex items-center justify-center"
                    >
                      <span className="text-2xl">🖼️</span>
                    </div>
                    <p className="text-sm font-medium">作品 {i}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-500 text-white">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">准备好开始创作了吗？</h2>
          <p className="text-xl mb-8 opacity-90">
            与数千名创作者一起，将你的想象力变为现实
          </p>
          <Link href="#">
            <Button 
              size="lg" 
              variant="outline" 
              className="bg-white text-primary-500 hover:bg-white/90"
            >
              立即开始创作
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}


