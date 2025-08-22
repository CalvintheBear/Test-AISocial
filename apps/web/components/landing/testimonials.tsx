import { Star } from 'lucide-react';
import Image from 'next/image';

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
    <section className={`bg-slate-50 py-24 dark:bg-slate-900 ${className}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-purple-600">
            用户评价
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            深受创作者喜爱
          </p>
          <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400">
            听听来自全球创作者的真实声音，看看他们如何用这个平台改变创作方式。
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article
              key={testimonial.name}
              className="rounded-2xl bg-white p-8 shadow-lg dark:bg-slate-800">
              <div className="flex items-center gap-x-1 text-purple-600">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <blockquote className="mt-6 text-lg leading-8 text-slate-700 dark:text-slate-300">
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
                  <div className="text-base font-semibold text-slate-900 dark:text-white">
                    {testimonial.name}
                  </div>
                  <div className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {testimonial.role} · {testimonial.company}
                  </div>
                </div>
              </figcaption>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}