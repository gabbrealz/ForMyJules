import { type ReactNode } from "react"

interface PageHeaderProps {
  title: string
  subtitle: string
  badge?: ReactNode
}

export default function PageHeader({ title, subtitle, badge }: PageHeaderProps) {
  if (badge === undefined) return (
    <header className="mb-6 space-y-1">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        {title}
      </h1>
      <p className="text-muted-foreground">
        {subtitle}
      </p>
    </header>
  )

  return (
    <header className="mb-6 space-y-1">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">
          {title}
        </h1>
        {badge}
      </div>
      <p className="text-muted-foreground">{subtitle}</p>
    </header>
  )
}
