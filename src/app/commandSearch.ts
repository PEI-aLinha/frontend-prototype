/** Normalises for accent-insensitive matching ("ambito" finds "Âmbito"). */
export const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** True when every word of the query appears somewhere in the text, in any order. */
export function matchesQuery(text: string, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean)
  const haystack = fold(text)
  return words.every((w) => haystack.includes(w))
}
