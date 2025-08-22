import { Users, Image, Heart, Zap } from 'lucide-react';
import { FadeInUp, AnimatedList } from '@/components/ui/animated-container';

interface Stat {
  icon: React.ReactNode;
  value: string;
  label: string;
  description: string;
}

const stats: Stat[] = [
  {
    icon: <Users className="h-8 w-8 text-foreground opacity-80" />,
    value: "10,000+",
    label: "活跃用户",
    description: "来自全球的创作者"
  },
  {
    icon: <Image className="h-8 w-8 text-foreground opacity-80" />,
    value: "50,000+",
    label: "AI 作品",
    description: "每日新增数百件"
  },
  {
    icon: <Heart className="h-8 w-8 text-foreground opacity-80" />,
    value: "100,000+",
    label: "互动点赞",
    description: "社区活跃度极高"
  },
  {
    icon: <Zap className="h-8 w-8 text-foreground opacity-80" />,
    value: "99.9%",
    label: "稳定运行",
    description: "7x24小时服务"
  }
];

interface StatsSectionProps {
  className?: string;
}

export function StatsSection({ className }: StatsSectionProps) {
  return (
    <section className={`relative py-24 sm:py-32 ${className}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
                 <div className="mx-auto max-w-2xl text-center">
           <FadeInUp delay={100}>
             <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
               用数据说话
             </h2>
           </FadeInUp>
           <FadeInUp delay={200}>
             <p className="mt-6 text-lg leading-8 text-muted-foreground">
               我们的平台正在改变创作者的工作方式，这些数字证明了我们的影响力。
             </p>
           </FadeInUp>
         </div>

        <AnimatedList
          className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 sm:mt-20 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-4"
          animation="fade-in-up"
          staggerDelay={100}
          delay={300}
        >
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center rounded-2xl bg-card p-8 text-center shadow-lg card-gradient-shadow card-hover">
              <dl>
                <dt className="flex flex-col items-center">
                  <span className={`rounded-lg p-3 shadow-sm ${
                    stat.label === "活跃用户" ? "bg-gradient-to-br from-cyan-400/20 to-blue-500/20" :
                    stat.label === "AI 作品" ? "bg-gradient-to-br from-purple-400/20 to-pink-500/20" :
                    stat.label === "互动点赞" ? "bg-gradient-to-br from-orange-400/20 to-red-500/20" :
                    "bg-gradient-to-br from-emerald-400/20 to-teal-500/20"
                  }`}>{stat.icon}</span>
                  <span className="mt-4 font-semibold text-foreground">{stat.label}</span>
                </dt>
                <dd className="mt-2 text-base leading-7 text-muted-foreground">
                  <div className="text-3xl font-bold tracking-tight text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground/90">{stat.description}</div>
                </dd>
              </dl>
            </div>
          ))}
        </AnimatedList>
      </div>
    </section>
  );
}