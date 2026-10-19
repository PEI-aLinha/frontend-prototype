import { beforeEach, describe, expect, it } from 'vitest'
import type { RegistrationInput } from '../contracts'
import { createMockApi } from './mockApi'
import { resetDemo } from './store'
import { MARTA, ORG_ID, PEDRO, RUI } from './seed'

let who = RUI
const api = createMockApi(() => ({ userId: who }))

const input: RegistrationInput = {
  account: { name: 'Rui Santos', email: 'rui.santos@compagueda.pt' },
  organization: {
    name: 'Componentes Águeda, Lda.', nif: '509180027', cae: '29320', sector: 'industria', subsector: 'automoveis',
    services: 'Fabrico de componentes para a indústria automóvel', employees: 120, turnover: 18_500_000,
    address: { street: 'Rua da Zona Industrial do Casarão, 45', postalCode: '3750-750', city: 'Águeda' },
    contacts: { phone: '234600120', email: 'geral@compagueda.pt' },
    permanentContact: { name: 'Rui Santos', phone: '912345678' },
  },
}

describe('assessment summary (RF10)', () => {
  beforeEach(() => {
    localStorage.clear()
    who = RUI
  })

  it('knows the target level before the current one exists', async () => {
    resetDemo('c1')
    const summary = await api.assessment.getAssessment(ORG_ID)
    expect(summary.maturity).toBeNull()
    expect(summary.targetMaturity).toBe(3)
  })

  it('reports both levels once the consultant validates', async () => {
    resetDemo('c3')
    const summary = await api.assessment.getAssessment(ORG_ID)
    expect(summary.status).toBe('validada')
    expect(summary.maturity).toBe(2)
    expect(summary.targetMaturity).toBe(3)
  })

  it('lowers the target when NIS2 is not among the frameworks', async () => {
    resetDemo('c0')
    const org = await api.organization.register(input)
    expect((await api.assessment.getAssessment(org.id)).targetMaturity).toBe(2)
  })

  it('denies the analyst', async () => {
    resetDemo('c3')
    who = PEDRO
    await expect(api.assessment.getAssessment(ORG_ID)).rejects.toMatchObject({ status: 403 })
    who = MARTA
    await expect(api.assessment.getAssessment(ORG_ID)).resolves.toMatchObject({ targetMaturity: 3 })
  })
})