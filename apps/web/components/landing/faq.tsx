import { FadeInUp, AnimatedList } from '@/components/ui/animated-container';

interface QA {
  q: string;
  a: string;
}

const faqs: QA[] = [
  { q: '生成是否有限制？', a: '购买积分即可解锁更高并发与更大尺寸，免费用户也可体验基础功能。' },
  { q: '支持哪些风格？', a: '支持写实、插画、动漫、水墨、赛博等数十种风格，并持续更新。' },
  { q: '可以商用吗？', a: '付费方案下可获得相应版权授权，具体以定价页说明为准。' },
  { q: '如何保障安全？', a: '我们提供内容审查与违规拦截，并对原创作品提供数字水印。' },
];

export function FAQSection() {
  return (
    <section className="relative bg-muted py-24 sm:py-32">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <FadeInUp delay={100}>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">常见问题</h2>
          </FadeInUp>
          <FadeInUp delay={200}>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">快速了解我们的功能、权限与合规说明。</p>
          </FadeInUp>
        </div>

        <FadeInUp delay={300}>
          <div className="mx-auto mt-12 max-w-3xl divide-y divide-border rounded-2xl border border-border bg-card card-gradient-shadow">
            {faqs.map((f, idx) => (
              <details key={idx} className="group p-6 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer items-center justify-between text-left text-base font-medium text-foreground">
                  {f.q}
                  <span className="ml-4 inline-block rounded-full border px-2 py-0.5 text-xs text-muted-foreground transition-all group-open:rotate-180">⌄</span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}


