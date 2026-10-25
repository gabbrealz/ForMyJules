export function deriveDisplayName(username: string): string {
  return username.charAt(0).toUpperCase() + username.slice(1)
}
