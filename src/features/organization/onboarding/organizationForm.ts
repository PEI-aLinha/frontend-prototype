import type { RegistrationInput } from '../../../api/contracts'
import { sectorById } from '../sectors'
import { isValidEmail } from '../../../config/email'

export interface OrganizationForm {
  name: string
  nif: string
  cae: string
  sector: string
  subsector: string
  services: string
  employees: string
  turnover: string
  address: string
  postalCode: string
  city: string
  phone: string
  email: string
  contactName: string
  contactPhone: string
}

export type OrganizationErrors = Partial<Record<keyof OrganizationForm, string>>

export const EMPTY_ORGANIZATION: OrganizationForm = {
  name: '', nif: '', cae: '', sector: '', subsector: '', services: '', employees: '', turnover: '',
  address: '', postalCode: '', city: '', phone: '', email: '', contactName: '', contactPhone: '',
}

/** Rui Santos's company (persona 2 of the technical report). Demo only. */
export const EXAMPLE_ORGANIZATION: OrganizationForm = {
  name: 'Componentes Águeda, Lda.',
  nif: '509180027',
  cae: '29320',
  sector: 'industria',
  subsector: 'automoveis',
  services: 'Fabrico de componentes metálicos e plásticos para a indústria automóvel, para fabricantes em Portugal e no resto da Europa.',
  employees: '120',
  turnover: '18 500 000',
  address: 'Rua da Zona Industrial do Casarão, 45',
  postalCode: '3750-750',
  city: 'Águeda',
  phone: '234 600 120',
  email: 'geral@compagueda.pt',
  contactName: 'Rui Santos',
  contactPhone: '912 345 678',
}

export const digits = (v: string) => v.replace(/\D/g, '')

/** Portuguese NIF: 9 digits, the last one is a mod-11 check digit. */
export function isValidNif(value: string): boolean {
  const d = digits(value)
  if (d.length !== 9) return false
  const sum = [...d.slice(0, 8)].reduce((acc, c, i) => acc + Number(c) * (9 - i), 0)
  const rest = sum % 11
  return Number(d[8]) === (rest < 2 ? 0 : 11 - rest)
}

const PHONE = /^[29]\d{8}$/

export function validateOrganization(f: OrganizationForm): OrganizationErrors {
  const e: OrganizationErrors = {}
  if (!f.name.trim()) e.name = 'Indique o nome da empresa, como está na certidão permanente.'

  const nif = digits(f.nif)
  if (!nif) e.nif = 'Indique o NIF da empresa.'
  else if (nif.length !== 9) e.nif = `O NIF tem 9 dígitos. Este tem ${nif.length}.`
  else if (!isValidNif(nif)) e.nif = 'Este NIF não é válido. Confirme se algum número está trocado.'

  const cae = digits(f.cae)
  if (!cae) e.cae = 'Indique o código CAE principal.'
  else if (cae.length !== 5) e.cae = 'O código CAE tem 5 dígitos. Exemplo: 29320.'

  const sector = sectorById(f.sector)
  if (!sector) e.sector = 'Escolha o setor de atividade.'
  else if (sector.subsectors.length > 0 && !f.subsector) e.subsector = 'Escolha o subsetor.'

  if (f.services.trim().length < 10) e.services = 'Descreva em poucas palavras o que a empresa faz ou vende.'

  const employees = Number(digits(f.employees))
  if (!f.employees.trim()) e.employees = 'Indique quantas pessoas trabalham na empresa.'
  else if (!/^\d[\d\s.]*$/.test(f.employees.trim()) || employees < 1) e.employees = 'Use só números inteiros. Exemplo: 120.'

  if (!f.turnover.trim()) e.turnover = 'Indique o volume de negócios do último ano.'
  else if (!/^\d[\d\s.]*$/.test(f.turnover.trim())) e.turnover = 'Use só números, em euros e sem cêntimos. Exemplo: 18 500 000.'

  if (!f.address.trim()) e.address = 'Indique a morada da sede.'
  if (!f.postalCode.trim()) e.postalCode = 'Indique o código postal.'
  else if (!/^\d{4}-\d{3}$/.test(f.postalCode.trim())) e.postalCode = 'Use o formato 0000-000.'
  if (!f.city.trim()) e.city = 'Indique a localidade.'

  if (!f.phone.trim()) e.phone = 'Indique o telefone da empresa.'
  else if (!PHONE.test(digits(f.phone))) e.phone = 'O telefone tem 9 dígitos e começa por 2 ou 9.'
  if (!f.email.trim()) e.email = 'Indique o email geral da empresa.'
  else if (!isValidEmail(f.email.trim())) e.email = 'Este email não parece válido. Exemplo: geral@empresa.pt'

  if (!f.contactName.trim()) e.contactName = 'Indique quem é o ponto de contacto permanente.'
  if (!f.contactPhone.trim()) e.contactPhone = 'Indique um telefone disponível a qualquer hora.'
  else if (!PHONE.test(digits(f.contactPhone))) e.contactPhone = 'O telefone tem 9 dígitos e começa por 2 ou 9.'
  return e
}

/** Form → contract (numbers without separators, phones and NIF as digits only). */
export function toOrganizationInput(f: OrganizationForm): RegistrationInput['organization'] {
  return {
    name: f.name.trim(),
    nif: digits(f.nif),
    cae: digits(f.cae),
    sector: f.sector,
    subsector: f.subsector || null,
    services: f.services.trim(),
    employees: Number(digits(f.employees)),
    turnover: Number(digits(f.turnover)),
    address: { street: f.address.trim(), postalCode: f.postalCode.trim(), city: f.city.trim() },
    contacts: { phone: digits(f.phone), email: f.email.trim().toLowerCase() },
    permanentContact: { name: f.contactName.trim(), phone: digits(f.contactPhone) },
  }
}
