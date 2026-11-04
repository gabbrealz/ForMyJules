import { usePageTitle } from "#hooks/use-page-title"
import { PageShell } from "#layouts/page-shell"

export default function Home() {
  usePageTitle("Home")

  return <PageShell title="Home" />
}
