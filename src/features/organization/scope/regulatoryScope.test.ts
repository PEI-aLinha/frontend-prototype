import { describe, expect, it } from 'vitest'
import type { Organization, OrganizationProfile, ScopeAnswers } from '../../../api/contracts'
import { computeScope } from './regulatoryScope'

const profile: OrganizationProfile = {
  nif: '509180027', cae: '29320', sector: 'industria', subsector: 'automoveis', services: 'Componentes', employees: 120, turnover: 18_500_000,
  address: { street: 'Rua', postalCode: '3750-750', city: 'Águeda' }, contacts: { phone: '234600120', email: 'geral@x.pt' }, permanentContact: { name: 'Rui', phone: '912345678' },
}
const scope: ScopeAnswers = { employeeData: 'sim', customerData: 'sim', usesAi: 'nao', aiUses: [], answeredBy: 'u-rui', answeredAt: '2026-10-09T09:31:00' }
const org = (p: Partial<OrganizationProfile> = {}, s: Partial<ScopeAnswers> = {}): Organization => ({
  id: 'o', slug: 'o', name: 'O', description: '', classification: '', frameworks: [], consultantId: null, profile: { ...profile, ...p }, scope: { ...scope, ...s },
})
const byId = (o: Organization) => Object.fromEntries(computeScope(o).map((r) => [r.id, r]))

describe('computeScope', () => {
  it('matches scenario 1 of the report: NIS2 and RGPD apply, AI Act does not', () => {
    const r = byId(org())
    expect([r.nis2.applicability, r.rgpd.applicability, r.aiact.applicability]).toEqual(['aplica', 'aplica', 'nao_aplica'])
  })
  it('leaves small companies and uncovered sectors out of NIS2', () => {
    expect(byId(org({ employees: 18, turnover: 900_000 })).nis2.applicability).toBe('nao_aplica')
    expect(byId(org({ sector: 'outro', subsector: null })).nis2.applicability).toBe('nao_aplica')
  })
  it('applies the RGPD only when the company keeps data about people', () => {
    expect(byId(org({}, { employeeData: 'nao', customerData: 'so_empresas' })).rgpd.applicability).toBe('nao_aplica')
    expect(byId(org({}, { employeeData: 'nao', customerData: 'sim' })).rgpd.reason).toContain('clientes')
  })
  it('explains each AI use and leaves "não sei" to be confirmed', () => {
    const ai = byId(org({}, { usesAi: 'sim', aiUses: ['chatbot', 'recrutamento'] })).aiact
    expect(ai.applicability).toBe('aplica')
    expect(ai.implications).toHaveLength(2)
    expect(byId(org({}, { usesAi: 'nao_sei' })).aiact.applicability).toBe('por_confirmar')
  })
})
