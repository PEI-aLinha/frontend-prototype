import { describe, expect, it } from 'vitest'
import type { OrganizationProfile } from '../../../api/contracts'
import { companySize, suggestNis2 } from './nis2Framing'

const base: OrganizationProfile = {
  nif: '509180027', cae: '29320', sector: 'industria', subsector: 'automoveis', services: 'Componentes', employees: 120, turnover: 18_500_000,
  address: { street: 'Rua', postalCode: '3750-750', city: 'Águeda' }, contacts: { phone: '234600120', email: 'geral@x.pt' }, permanentContact: { name: 'Rui', phone: '912345678' },
}
const suggest = (p: Partial<OrganizationProfile>) => suggestNis2({ ...base, ...p }).classification

describe('suggestNis2', () => {
  it('suggests "importante" for Rui Santos\'s factory (Annex II, medium)', () => {
    expect(suggest({})).toBe('importante')
  })
  it('suggests "essencial" only for large companies in Annex I sectors', () => {
    expect(suggest({ sector: 'energia', subsector: 'eletricidade', employees: 300 })).toBe('essencial')
    expect(suggest({ sector: 'energia', subsector: 'eletricidade', employees: 120 })).toBe('importante')
    expect(suggest({ employees: 300 })).toBe('importante')
  })
  it('leaves small companies and other sectors out', () => {
    expect(suggest({ employees: 18, turnover: 900_000 })).toBe('nao_abrangida')
    expect(suggest({ sector: 'outro', subsector: null })).toBe('nao_abrangida')
  })
  it('classifies size by workers or turnover', () => {
    expect(companySize(40, 12_000_000)).toBe('media')
    expect(companySize(40, 60_000_000)).toBe('grande')
  })
})
