import { Avatar, AvatarFallback, AvatarImage } from "#components/ui/avatar"

type UserCellProps = {
  username: string
  avatarUrl?: string
}

// Avatar + username, used as the first column of the admin tables.
// Falls back to the initial on the same apricot chip the sidebar profile uses.
export function UserCell({ username, avatarUrl }: UserCellProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar size="lg">
        {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
        <AvatarFallback className="bg-apricot font-heading font-semibold text-brown">
          {username.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="truncate font-medium">{username}</span>
    </div>
  )
}
