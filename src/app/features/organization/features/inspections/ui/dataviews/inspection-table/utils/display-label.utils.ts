export function toDisplayLabel(value: string | null | undefined): string {
  if (!value) return '';

  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((token: string) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}