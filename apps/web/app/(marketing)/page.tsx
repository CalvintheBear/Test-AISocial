import { Button, Card, Badge } from '@/components/ui'
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

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
  const proofImages = [
    { id: 1, title: '赛博朋克猫', author: '用户A', likes: 1234 },
    { id: 2, title: '水墨风山水', author: '用户B', likes: 892 },
    { id: 3, title: '未来城市', author: '用户C', likes: 2456 },
    { id: 4, title: '萌宠拟人', author: '用户D', likes: 678 },
    { id: 5, title: '国风建筑', author: '用户E', likes: 1567 },
    { id: 6, title: '科幻场景', author: '用户F', likes: 3456 },
  ]

  return (
    <main className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="bg-grid py-20 md:py-32 relative overflow-hidden">
        <div className="container text-center relative z-10">
          <Badge variant="default" className="mb-6 bg-primary-100 text-primary-700"
          >
            ✨ AI驱动创意新境界
          </Badge>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6"
          >
            <span className="text-gradient">生成最潮的AI艺术作品</span>
            <br className="hidden md:block" />
            <span className="text-text">释放你的创造力</span>
          </h1>
          <p className="text-lg md:text-xl text-text-2 max-w-2xl mx-auto mb-8"
          >
            只需一句话，即刻拥有属于你的AIGC杰作。免费、快速、无限创意。
            加入AI创作社区，与全球创作者一起探索人工智能艺术的无限可能。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="text-lg px-8 bg-primary-500 hover:bg-primary-600"
              >
                立即免费生成 →
              </Button>
            </Link>
            <Link href="/features">
              <Button variant="outline" size="lg" className="text-lg px-8"
              >
                查看全部功能
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Visual Proof Grid */}
        <div className="container mt-16">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {proofImages.map((image) => (
              <div key={image.id} className="aspect-square rounded-lg overflow-hidden shadow-md"
              >
                <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center"
                >
                  <div className="text-center"
                  >
                    <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-2"
                    >
                      <span className="text-2xl">🎨</span>
                    </div>
                    <p className="text-sm font-medium text-text">{image.title}</p>
                    <p className="text-xs text-text-2">{image.likes} 喜欢</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three Steps Section */}
      <section className="py-20 bg-surface">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">三步创作，如此简单</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          >
            <div className="text-center">
              <div 
                className="w-16 h-16 rounded-full bg-primary-500 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4"
              >
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">输入你的想法</h3>
              <p className="text-text-2">简单描述或上传草图，AI即刻理解你的创意</p>
            </div>
            <div className="text-center">
              <div 
                className="w-16 h-16 rounded-full bg-primary-500 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4"
              >
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">AI即刻生成</h3>
              <p className="text-text-2">选择风格模型，几秒钟内生成高质量作品</p>
            </div>
            <div className="text-center">
              <div 
                className="w-16 h-16 rounded-full bg-primary-500 text-white flex items-center justify-center text-2xl font-bold mx-auto mb-4"
              >
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">发布并分享</h3>
              <p className="text-text-2">一键发布到社区，与全球创作者分享你的杰作</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Section */}
      <section className="py-20 bg-grid">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">为什么选择我们？</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          >
            <Card className="p-8 text-center shadow-lg">
              <div 
                className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4"
              >
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">极速出图</h3>
              <p className="text-text-2">先进的AI引擎，几秒钟生成高质量作品</p>
            </Card>
            <Card className="p-8 text-center shadow-lg">
              <div 
                className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4"
              >
                <span className="text-2xl">🎨</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">模型先进</h3>
              <p className="text-text-2">支持多种风格模型，精准理解中文提示词</p>
            </Card>
            <Card className="p-8 text-center shadow-lg">
              <div 
                className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4"
              >
                <span className="text-2xl">🌐</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">社区分享</h3>
              <p className="text-text-2">活跃的创作社区，发现灵感，获得反馈</p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-500 text-white">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">加入我们，释放你的创造力</h2>
          <p className="text-lg mb-8 opacity-90">
            立即开始你的AI创作之旅，无限可能等你探索
          </p>
          <Link href="/login">
            <Button 
              size="lg" 
              className="text-lg px-8 bg-white text-primary-600 hover:bg-gray-100"
            >
              立即免费加入 →
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line py-8 bg-surface">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0"
          >
            <div className="text-text-2">
              © 2024 AI Social. 保留所有权利。
            </div>
            <div className="flex space-x-6">
              <Link href="/about" className="text-text-2 hover:text-primary-500 transition-colors">关于我们</Link>
              <Link href="/terms" className="text-text-2 hover:text-primary-500 transition-colors">服务条款</Link>
              <Link href="/privacy" className="text-text-2 hover:text-primary-500 transition-colors">隐私政策</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}


