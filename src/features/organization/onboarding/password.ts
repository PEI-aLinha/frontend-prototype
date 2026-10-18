export const PASSWORD_RULES = [
  { label: 'Pelo menos 12 caracteres', test: (p: string) => p.length >= 12 },
  { label: 'Letras e números', test: (p: string) => /[a-zA-Z]/.test(p) && /\d/.test(p) },
]

export const passwordIsValid = (p: string) => PASSWORD_RULES.every((r) => r.test(p))

/** Example password for the demo "fill in" buttons: generated, never stored in the code. Always meets PASSWORD_RULES. */
export function examplePassword(): string {
  const letters = 'abcdefghijkmnpqrstuvwxyz'
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  const word = Array.from(bytes.slice(0, 10), (b) => letters[b % letters.length]).join('')
  return word.charAt(0).toUpperCase() + word.slice(1) + String(bytes[10] % 10) + String(bytes[11] % 10)
}
