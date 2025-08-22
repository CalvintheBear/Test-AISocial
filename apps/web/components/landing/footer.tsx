import { Github, Twitter, Instagram } from 'lucide-react';
import Link from 'next/link';

interface FooterProps {
  className?: string;
}

const navigation = {
  product: [
    { name: '功能特性', href: '/features' },
    { name: '价格方案', href: '/pricing' },
    { name: '案例展示', href: '/showcase' },
    { name: '更新日志', href: '/changelog' },
  ],
  company: [
    { name: '关于我们', href: '/about' },
    { name: '博客', href: '/blog' },
    { name: '招聘', href: '/careers' },
    { name: '联系我们', href: '/contact' },
  ],
  resources: [
    { name: '帮助中心', href: '/help' },
    { name: 'API文档', href: '/docs' },
    { name: '社区', href: '/community' },
    { name: '教程', href: '/tutorials' },
  ],
  legal: [
    { name: '隐私政策', href: '/privacy' },
    { name: '服务条款', href: '/terms' },
    { name: 'Cookie政策', href: '/cookies' },
  ],
};

export function Footer({ className }: FooterProps) {
  return (
    <footer className={`bg-muted ${className}`}>
      <div className="mx-auto max-w-7xl overflow-hidden px-6 py-20 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary" />
              <span className="text-xl font-bold text-foreground">AI创作平台</span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              释放你的创意潜能，用AI创造令人惊叹的视觉艺术。
              加入我们的创作者社区，探索无限可能。
            </p>
            <div className="mt-6 flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <span className="sr-only">Twitter</span>
                <Twitter className="h-6 w-6" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <span className="sr-only">GitHub</span>
                <Github className="h-6 w-6" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground">
                <span className="sr-only">Instagram</span>
                <Instagram className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold leading-6 text-foreground">产品</h3>
            <ul role="list" className="mt-6 space-y-4">
              {navigation.product.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold leading-6 text-foreground">公司</h3>
            <ul role="list" className="mt-6 space-y-4">
              {navigation.company.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold leading-6 text-foreground">资源</h3>
            <ul role="list" className="mt-6 space-y-4">
              {navigation.resources.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold leading-6 text-foreground">法律</h3>
            <ul role="list" className="mt-6 space-y-4">
              {navigation.legal.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm leading-6 text-muted-foreground hover:text-foreground">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-border pt-8">
          <p className="text-xs leading-5 text-muted-foreground">
            © 2024 AI创作平台. 保留所有权利.
          </p>
        </div>
      </div>
    </footer>
  );
}