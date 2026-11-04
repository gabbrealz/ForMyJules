import { usePageTitle } from "#hooks/use-page-title"
import { PageShell } from "#layouts/page-shell"

export default function Profile() {
  usePageTitle("Profile")

  return <PageShell title="Profile" />
}
