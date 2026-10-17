export const PASSWORD_RULES = [
  { label: 'Pelo menos 12 caracteres', test: (p: string) => p.length >= 12 },
  { label: 'Letras e números', test: (p: string) => /[a-zA-Z]/.test(p) && /\d/.test(p) },
]

export const passwordIsValid = (p: string) => PASSWORD_RULES.every((r) => r.test(p))
