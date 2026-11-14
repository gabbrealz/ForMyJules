import { canManagePhotos, useRequiredUser } from "#features/auth"
import { GalleryToolbar, PhotoGallery, usePhotoFeed } from "#features/photos"
import { usePageTitle } from "#hooks/use-page-title"
import { PageShell } from "#layouts/page-shell"

export default function Gallery() {
  usePageTitle("Gallery")
  const user = useRequiredUser()
  const feed = usePhotoFeed()

  return (
    <PageShell title="Gallery">
      <GalleryToolbar
        canUpload={canManagePhotos(user)}
        onUploaded={feed.prepend}
      />
      <PhotoGallery feed={feed} />
    </PageShell>
  )
}
