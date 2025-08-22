import { Sparkles, Zap, Shield, Users, Palette, Rocket } from 'lucide-react';
import { FadeInUp, AnimatedList } from '@/components/ui/animated-container';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <Sparkles className="h-6 w-6 text-foreground opacity-80" />,
    title: "AI 智能创作",
    description: "使用最先进的AI模型，将你的创意转化为独特的视觉艺术作品"
  },
  {
    icon: <Palette className="h-6 w-6 text-foreground opacity-80" />,
    title: "多样化风格",
    description: "支持多种艺术风格，从写实到抽象，满足不同创作需求"
  },
  {
    icon: <Zap className="h-6 w-6 text-foreground opacity-80" />,
    title: "极速生成",
    description: "优化的AI算法，让你的创意在几秒钟内变成现实"
  },
  {
    icon: <Users className="h-6 w-6 text-foreground opacity-80" />,
    title: "创作者社区",
    description: "加入活跃的创作者社区，分享作品，获取灵感，结交志同道合的朋友"
  },
  {
    icon: <Shield className="h-6 w-6 text-foreground opacity-80" />,
    title: "版权保护",
    description: "为你的原创作品提供完整的版权保护和数字水印"
  },
  {
    icon: <Rocket className="h-6 w-6 text-foreground opacity-80" />,
    title: "持续更新",
    description: "定期更新AI模型和功能，让你的创作工具始终保持领先"
  }
];

interface FeaturesGridProps {
  className?: string;
}

export function FeaturesGrid({ className }: FeaturesGridProps) {
  return (
    <section className={`relative py-24 sm:py-32 ${className}`}>
      {/* Top gradient transition */}
      <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none" />
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
                 <div className="mx-auto max-w-2xl text-center">
           <FadeInUp delay={100}>
             <h2 className="text-base font-semibold leading-7 text-gray-700 bg-gray-50 px-3 py-1 rounded-full inline-block">
               核心功能
             </h2>
           </FadeInUp>
           <FadeInUp delay={200}>
             <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
               释放你的创作潜能
             </p>
           </FadeInUp>
           <FadeInUp delay={300}>
             <p className="mt-6 text-lg leading-8 text-muted-foreground">
               我们提供了一套完整的AI创作工具，让每个人都能成为艺术家。
               无论你是专业设计师还是创意爱好者，都能在这里找到适合你的创作方式。
             </p>
           </FadeInUp>
         </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <AnimatedList
            className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3"
            animation="fade-in-up"
            staggerDelay={100}
            delay={400}
          >
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-border bg-card p-8 transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 card-gradient-shadow card-hover">
                <dl>
                  <dt className="flex items-center gap-4">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 shadow-sm ${
                      feature.title === "AI 智能创作" ? "bg-gradient-to-br from-cyan-400/20 to-blue-500/20" :
                      feature.title === "多样化风格" ? "bg-gradient-to-br from-purple-400/20 to-pink-500/20" :
                      feature.title === "极速生成" ? "bg-gradient-to-br from-emerald-400/20 to-teal-500/20" :
                      feature.title === "创作者社区" ? "bg-gradient-to-br from-orange-400/20 to-red-500/20" :
                      feature.title === "版权保护" ? "bg-gradient-to-br from-indigo-400/20 to-purple-500/20" :
                      "bg-gradient-to-br from-yellow-400/20 to-orange-500/20"
                    }`}>
                      {feature.icon}
                    </span>
                    <span className="text-lg font-semibold leading-7 text-foreground">{feature.title}</span>
                  </dt>
                  <dd className="mt-4 text-base leading-7 text-muted-foreground">
                    {feature.description}
                  </dd>
                </dl>
              </div>
            ))}
          </AnimatedList>
        </div>
      </div>
    </section>
  );
}