import { beforeEach, describe, expect, it } from 'vitest'
import type { RegistrationInput } from '../contracts'
import { createMockApi } from './mockApi'
import { getState, resetDemo } from './store'
import { ORG_ID, PEDRO, RUI } from './seed'
import { slugify } from './organizationMock'

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

describe('organization registration (US10)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemo('c0')
  })

  it('registers the organization and associates it with the new account', async () => {
    const org = await api.organization.register(input)
    expect(org).toMatchObject({ id: ORG_ID, slug: 'componentes-agueda', registeredBy: RUI, consultantId: null })
    expect(getState().users.find((u) => u.id === RUI)).toMatchObject({ role: 'responsavel', email: 'rui.santos@compagueda.pt' })
    expect(getState().audit.at(-1)).toMatchObject({ entityType: 'organization', userId: RUI })
    expect(await api.directory.getOrganization('componentes-agueda')).toMatchObject({ profile: { nif: '509180027' } })
  })

  it('refuses a NIF or an email that is already registered', async () => {
    await api.organization.register(input)
    await expect(api.organization.register({ ...input, account: { ...input.account, email: 'outro@compagueda.pt' } })).rejects.toMatchObject({ status: 409 })
    await expect(api.organization.register({ ...input, organization: { ...input.organization, nif: '123456789' } })).rejects.toMatchObject({ status: 409 })
  })

  it('builds the URL slug without the legal form', () => {
    expect(slugify('Componentes Águeda, Lda.')).toBe('componentes-agueda')
    expect(slugify('LogiCentro Armazéns, S.A.')).toBe('logicentro-armazens')
  })
})

describe('regulatory scope answers (US34)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemo('c1')
    who = RUI
  })

  it('saves the answers and drops AI uses when the company does not use AI', async () => {
    const org = await api.organization.saveScope(ORG_ID, { employeeData: 'sim', customerData: 'so_empresas', usesAi: 'nao', aiUses: ['chatbot'] })
    expect(org.scope).toMatchObject({ customerData: 'so_empresas', usesAi: 'nao', aiUses: [], answeredBy: RUI })
  })

  it('only lets the designated manager answer', async () => {
    who = PEDRO
    await expect(api.organization.saveScope(ORG_ID, { employeeData: 'sim', customerData: 'sim', usesAi: 'nao', aiUses: [] })).rejects.toMatchObject({ status: 403 })
  })
})

describe('official NIS2 qualification (US11)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemo('c1')
    who = RUI
  })
  const doc = { name: 'Ato-de-Qualificacao-CNCS.pdf', size: 248_000 }

  it('registers the classification, date and document', async () => {
    const org = await api.organization.registerQualification(ORG_ID, { classification: 'importante', date: '2026-10-12', document: doc })
    expect(org.officialQualification).toMatchObject({ classification: 'importante', date: '2026-10-12', registeredBy: RUI })
    expect(getState().audit.at(-1)?.summary).toContain('Entidade importante')
  })

  it('refuses a future date, a non-PDF file and other roles', async () => {
    await expect(api.organization.registerQualification(ORG_ID, { classification: 'importante', date: '2027-01-01', document: doc })).rejects.toMatchObject({ status: 422 })
    await expect(api.organization.registerQualification(ORG_ID, { classification: 'importante', date: '2026-10-12', document: { name: 'ato.docx', size: 1 } })).rejects.toMatchObject({ status: 422 })
    who = PEDRO
    await expect(api.organization.registerQualification(ORG_ID, { classification: 'importante', date: '2026-10-12', document: doc })).rejects.toMatchObject({ status: 403 })
  })
})
