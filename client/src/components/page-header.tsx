import { type ReactNode } from "react"

interface PageHeaderProps {
  title: string
  subtitle?: string
  badge?: ReactNode
}

export default function PageHeader({ title, subtitle, badge }: PageHeaderProps) {
  const heading = (
    <h1 className="font-heading font-extrabold tracking-tight text-3xl lg:text-4xl">
      {title}
    </h1>
  )

  return (
    <header className="mb-6 space-y-1 text-center md:text-left">
      {badge === undefined ? (
        heading
      ) : (
        <div className="flex items-center gap-3 justify-center md:justify-start">
          {heading}
          {badge}
        </div>
      )}
      {subtitle && <p className="text-muted-foreground text-sm md:text-base">{subtitle}</p>}
    </header>
  )
}
