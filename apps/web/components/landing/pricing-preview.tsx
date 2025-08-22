import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CTAButton } from '@/components/ui/cta-button';
import { FadeInUp, AnimatedList } from '@/components/ui/animated-container';

const tiers = [
  {
    name: '入门',
    price: '￥0',
    desc: '体验基础功能',
    features: ['每日限量生成', '基础分辨率', '社区浏览'],
    cta: '免费开始',
    href: '/login',
    highlight: false,
  },
  {
    name: '专业',
    price: '￥29',
    desc: '适合频繁创作',
    features: ['高分辨率输出', '优先队列', '增强风格包'],
    cta: '立即升级',
    href: '/pricing',
    highlight: true,
  },
  {
    name: '工作室',
    price: '￥99',
    desc: '团队与商用',
    features: ['团队协作', '商用授权', '专属支持'],
    cta: '查看详情',
    href: '/pricing',
    highlight: false,
  },
];

export function PricingPreviewSection() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="container">
                 <div className="mx-auto max-w-2xl text-center">
           <FadeInUp delay={100}>
             <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">价格方案一览</h2>
           </FadeInUp>
           <FadeInUp delay={200}>
             <p className="mt-6 text-lg leading-8 text-muted-foreground">根据你的创作需求自由选择，随时升级。</p>
           </FadeInUp>
         </div>

        <AnimatedList
          className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3"
          animation="fade-in-up"
          staggerDelay={100}
          delay={300}
        >
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border border-border bg-card p-6 shadow transition-all hover:shadow-lg card-gradient-shadow card-hover ${tier.highlight ? 'ring-1 ring-primary' : ''}`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold text-foreground">{tier.name}</h3>
                <div className="text-2xl font-bold text-foreground">{tier.price}</div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{tier.desc}</p>
              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                                         <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white text-xs font-bold">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {tier.highlight ? (
                  <CTAButton href={tier.href} size="md" variant="primary" className="btn-animate">
                    {tier.cta}
                  </CTAButton>
                ) : (
                  <CTAButton href={tier.href} size="md" variant="secondary" className="w-full btn-animate">
                    {tier.cta}
                  </CTAButton>
                )}
              </div>
            </div>
          ))}
        </AnimatedList>
      </div>
    </section>
  );
}


