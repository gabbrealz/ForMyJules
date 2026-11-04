import { type ReactNode } from "react"

interface PageHeaderProps {
  title: string
  subtitle?: string
  badge?: ReactNode
}

export default function PageHeader({ title, subtitle, badge }: PageHeaderProps) {
  const heading = (
    <h1 className="font-heading text-3xl font-extrabold tracking-tight">
      {title}
    </h1>
  )

  return (
    <header className="mb-6 space-y-1">
      {badge === undefined ? (
        heading
      ) : (
        <div className="flex items-center gap-3">
          {heading}
          {badge}
        </div>
      )}
      {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
    </header>
  )
}
