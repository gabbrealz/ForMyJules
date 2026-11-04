import { usePageTitle } from "#hooks/use-page-title"
import { PageShell } from "#layouts/page-shell"

export default function Gallery() {
  usePageTitle("Gallery")

  return <PageShell title="Gallery" />
}
