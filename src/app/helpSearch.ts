import { GLOSSARY, type GlossaryEntry } from '../config/glossary'
import { matchesQuery } from './commandSearch'

/** Glossary entries whose term, definition or example match every word of the query, ignoring accents. */
export function searchGlossary(query: string): GlossaryEntry[] {
  const all = (Object.values(GLOSSARY) as GlossaryEntry[]).toSorted((a, b) => a.term.localeCompare(b.term, 'pt'))
  if (!query.trim()) return all
  return all.filter((e) => matchesQuery(`${e.term} ${e.short} ${e.example ?? ''}`, query))
}
