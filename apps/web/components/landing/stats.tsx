import { Users, Image, Heart, Zap } from 'lucide-react';

interface Stat {
  icon: React.ReactNode;
  value: string;
  label: string;
  description: string;
}

const stats: Stat[] = [
  {
    icon: <Users className="h-8 w-8" />,
    value: "10,000+",
    label: "活跃用户",
    description: "来自全球的创作者"
  },
  {
    icon: <Image className="h-8 w-8" />,
    value: "50,000+",
    label: "AI 作品",
    description: "每日新增数百件"
  },
  {
    icon: <Heart className="h-8 w-8" />,
    value: "100,000+",
    label: "互动点赞",
    description: "社区活跃度极高"
  },
  {
    icon: <Zap className="h-8 w-8" />,
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
    <section className={`py-24 sm:py-32 ${className}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            用数据说话
          </h2>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400">
            我们的平台正在改变创作者的工作方式，这些数字证明了我们的影响力。
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 sm:mt-20 sm:grid-cols-2 lg:mx-0 lg:max-w-none lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center justify-center rounded-2xl bg-white p-8 text-center shadow-lg dark:bg-slate-800">
              <div className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 p-3 text-white">
                {stat.icon}
              </div>
              <dt className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {stat.value}
              </dt>
              <dd className="mt-2 text-base leading-7 text-slate-600 dark:text-slate-400">
                <div className="font-semibold text-slate-900 dark:text-white">{stat.label}</div>
                <div className="text-sm">{stat.description}</div>
              </dd>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}