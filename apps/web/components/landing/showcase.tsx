import Image from 'next/image';
import { FadeInUp, AnimatedList } from '@/components/ui/animated-container';

interface ShowcaseItem {
  src: string;
  title: string;
}

const items: ShowcaseItem[] = [
  { src: '/imgs/showcases/1.png', title: 'AI 风格插画' },
  { src: '/imgs/showcases/2.png', title: '未来主义海报' },
  { src: '/imgs/showcases/3.png', title: '赛博城市景观' },
  { src: '/imgs/showcases/4.png', title: '极简抽象艺术' },
  { src: '/imgs/showcases/5.png', title: '写实人像风格' },
  { src: '/imgs/showcases/6.png', title: '幻想生物设计' },
];

export function ShowcaseSection() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center">
          <FadeInUp delay={100}>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">精选作品展示</h2>
          </FadeInUp>
          <FadeInUp delay={200}>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">来自社区创作者的杰出作品，获取灵感，开启你的创作之旅。</p>
          </FadeInUp>
        </div>

        <AnimatedList
          className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          animation="fade-in-up"
          staggerDelay={100}
          delay={300}
        >
          {items.map((item) => (
            <div key={item.src} className="group overflow-hidden rounded-2xl border border-border bg-card shadow transition-all hover:shadow-lg card-gradient-shadow card-hover">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src={item.src} alt={item.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105 image-hover" />
              </div>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">{item.title}</p>
              </div>
            </div>
          ))}
        </AnimatedList>
      </div>
    </section>
  );
}


