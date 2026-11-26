import { describe, expect, it } from 'vitest'
import { searchGlossary } from './helpSearch'

describe('searchGlossary', () => {
  it('lists every term in alphabetical order when the query is empty', () => {
    const all = searchGlossary('')
    expect(all.length).toBeGreaterThan(5)
    expect(all.map((e) => e.term)).toEqual(all.map((e) => e.term).toSorted((a, b) => a.localeCompare(b, 'pt')))
  })

  it('matches the definition too, ignoring accents', () => {
    expect(searchGlossary('servico critico').map((e) => e.term)).toContain('Serviço crítico')
    expect(searchGlossary('faturacao').length).toBeGreaterThan(0)
  })

  it('returns nothing for unrelated words', () => {
    expect(searchGlossary('xyzzy')).toEqual([])
  })
})
