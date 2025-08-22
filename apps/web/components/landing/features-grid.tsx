import { Check, Sparkles, Zap, Shield, Users, Palette, Rocket } from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "AI 智能创作",
    description: "使用最先进的AI模型，将你的创意转化为独特的视觉艺术作品"
  },
  {
    icon: <Palette className="h-6 w-6" />,
    title: "多样化风格",
    description: "支持多种艺术风格，从写实到抽象，满足不同创作需求"
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "极速生成",
    description: "优化的AI算法，让你的创意在几秒钟内变成现实"
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "创作者社区",
    description: "加入活跃的创作者社区，分享作品，获取灵感，结交志同道合的朋友"
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "版权保护",
    description: "为你的原创作品提供完整的版权保护和数字水印"
  },
  {
    icon: <Rocket className="h-6 w-6" />,
    title: "持续更新",
    description: "定期更新AI模型和功能，让你的创作工具始终保持领先"
  }
];

interface FeaturesGridProps {
  className?: string;
}

export function FeaturesGrid({ className }: FeaturesGridProps) {
  return (
    <section className={`py-24 sm:py-32 ${className}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-purple-600">
            核心功能
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            释放你的创作潜能
          </p>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400">
            我们提供了一套完整的AI创作工具，让每个人都能成为艺术家。
            无论你是专业设计师还是创意爱好者，都能在这里找到适合你的创作方式。
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="flex flex-col">
                <div className="relative rounded-2xl border border-slate-200 p-8 transition-all hover:shadow-lg dark:border-slate-700 dark:hover:shadow-purple-500/10">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                    {feature.icon}
                  </div>
                  <dt className="mt-6 text-lg font-semibold leading-7 text-slate-900 dark:text-white">
                    {feature.title}
                  </dt>
                  <dd className="mt-2 flex flex-auto flex-col text-base leading-7 text-slate-600 dark:text-slate-400">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}