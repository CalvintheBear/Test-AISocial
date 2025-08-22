import { PackageOpen } from 'lucide-react'
import { FadeInUp } from '@/components/ui/animated-container'

interface EmptyStateProps {
  title?: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ 
  title = '暂无内容', 
  description = '这里还没有任何内容，请稍后再来查看', 
  action 
}: EmptyStateProps) {
  return (
    <FadeInUp delay={100}>
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="relative">
          <PackageOpen className="h-16 w-16 text-muted-foreground mb-4" />
          <div className="absolute inset-0 bg-gradient-to-r from-sky-200/30 to-emerald-200/20 rounded-full blur-xl" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
          {description}
        </p>
        {action && <div>{action}</div>}
      </div>
    </FadeInUp>
  )
}