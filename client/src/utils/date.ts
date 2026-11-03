export function formatToUserTime(
  isoString: string | Date, 
  options: Intl.DateTimeFormatOptions = {}
): string {
  const date = new Date(isoString);
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options
  };

  // 'undefined' automatically uses the user's browser/system locale and timezone
  return new Intl.DateTimeFormat(undefined, defaultOptions).format(date);
}
