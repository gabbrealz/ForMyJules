interface PageHeaderProps {
  title: string
  subtitle: string
}

export default function PageHeader({ title, subtitle}: PageHeaderProps) {
  return (
    <header className="mb-6 space-y-1">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">
        {title}
      </h1>
      <p className="text-muted-foreground">
        {subtitle}
      </p>
    </header>
  )
}
