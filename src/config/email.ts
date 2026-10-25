/** Simple email check without a backtracking-prone regex: one "@", no spaces, a dotted domain. */
export function isValidEmail(value: string): boolean {
  if (/\s/.test(value)) return false
  const parts = value.split('@')
  if (parts.length !== 2 || !parts[0]) return false
  const domain = parts[1].split('.')
  return domain.length >= 2 && domain.every(Boolean)
}
