import { Star } from 'lucide-react';
import Image from 'next/image';
import { FadeInUp, AnimatedList } from '@/components/ui/animated-container';

interface Testimonial {
  name: string;
  role: string;
  company: string;
  content: string;
  avatar: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: "李明",
    role: "数字艺术家",
    company: "创意工作室",
    content: "这个平台彻底改变了我的创作流程。AI生成的作品质量超出预期，社区里的反馈让我不断进步。",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    rating: 5
  },
  {
    name: "王雪",
    role: "UI设计师",
    company: "科技公司",
    content: "作为一名设计师，这个AI工具给了我无限的灵感。它生成的概念图帮助我快速验证设计思路。",
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    rating: 5
  },
  {
    name: "张伟",
    role: "内容创作者",
    company: "自媒体",
    content: "以前需要几天才能完成的插画，现在几分钟就能生成多种风格。效率提升了10倍！",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    rating: 5
  }
];

interface TestimonialsSectionProps {
  className?: string;
}

export function TestimonialsSection({ className }: TestimonialsSectionProps) {
  return (
    <section className={`relative bg-muted py-24 sm:py-32 ${className}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
                 <div className="mx-auto max-w-2xl text-center">
           <FadeInUp delay={100}>
             <h2 className="text-base font-semibold leading-7 text-gray-700 bg-gray-50 px-3 py-1 rounded-full inline-block">
               用户评价
             </h2>
           </FadeInUp>
           <FadeInUp delay={200}>
             <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
               深受创作者喜爱
             </p>
           </FadeInUp>
           <FadeInUp delay={300}>
             <p className="mt-6 text-lg leading-8 text-muted-foreground">
               听听来自全球创作者的真实声音，看看他们如何用这个平台改变创作方式。
             </p>
           </FadeInUp>
         </div>

        <AnimatedList
          className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3"
          animation="fade-in-up"
          staggerDelay={100}
          delay={400}
        >
          {testimonials.map((testimonial) => (
            <article
              key={testimonial.name}
              className="rounded-2xl bg-card p-8 shadow-lg card-gradient-shadow card-hover">
              <div className="flex items-center gap-x-1">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400 drop-shadow-sm" />
                ))}
              </div>
              <blockquote className="mt-6 text-lg leading-8 text-foreground/80">
                "{testimonial.content}"
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-x-4">
                <Image
                  className="h-12 w-12 rounded-full bg-slate-50"
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  width={48}
                  height={48}
                />
                <div>
                  <div className="text-base font-semibold text-foreground">
                    {testimonial.name}
                  </div>
                  <div className="text-sm leading-6 text-muted-foreground">
                    {testimonial.role} · {testimonial.company}
                  </div>
                </div>
              </figcaption>
            </article>
          ))}
        </AnimatedList>
      </div>
    </section>
  );
}