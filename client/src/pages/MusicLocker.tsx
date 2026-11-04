import { usePageTitle } from "#hooks/use-page-title"
import { PageShell } from "#layouts/page-shell"

export default function MusicLocker() {
  usePageTitle("Music Locker")

  return <PageShell title="Music Locker" />
}
