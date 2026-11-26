import { describe, expect, it } from 'vitest'
import { matchesQuery } from './commandSearch'

describe('command menu search', () => {
  it('ignores accents and case', () => {
    expect(matchesQuery('Âmbito regulatório', 'ambito')).toBe(true)
  })

  it('matches every word in any order', () => {
    expect(matchesQuery('Riscos · Componentes Águeda', 'agueda riscos')).toBe(true)
    expect(matchesQuery('Riscos · Componentes Águeda', 'agueda ativos')).toBe(false)
  })

  it('matches everything for an empty query', () => {
    expect(matchesQuery('Carteira', '   ')).toBe(true)
  })
})
