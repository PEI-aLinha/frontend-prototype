import { describe, expect, it } from 'vitest'
import { EMPTY_ORGANIZATION, EXAMPLE_ORGANIZATION, isValidNif, validateOrganization } from './organizationForm'

describe('isValidNif', () => {
  it('accepts a NIF with a correct check digit', () => {
    expect(isValidNif('509180027')).toBe(true)
    expect(isValidNif('509 180 027')).toBe(true)
  })
  it('rejects a wrong check digit or length', () => {
    expect(isValidNif('509180028')).toBe(false)
    expect(isValidNif('50918002')).toBe(false)
  })
})

describe('validateOrganization', () => {
  it('accepts the demo company', () => {
    expect(validateOrganization(EXAMPLE_ORGANIZATION)).toEqual({})
  })
  it('flags every required field when empty', () => {
    const errors = validateOrganization(EMPTY_ORGANIZATION)
    expect(Object.keys(errors).sort()).toEqual(
      ['address', 'cae', 'city', 'contactName', 'contactPhone', 'email', 'employees', 'name', 'nif', 'phone', 'postalCode', 'sector', 'services', 'turnover'].sort(),
    )
  })
  it('requires a subsector only when the sector has subsectors', () => {
    expect(validateOrganization({ ...EXAMPLE_ORGANIZATION, subsector: '' }).subsector).toBeDefined()
    expect(validateOrganization({ ...EXAMPLE_ORGANIZATION, sector: 'saude', subsector: '' }).subsector).toBeUndefined()
  })
  it('explains a NIF with the wrong number of digits', () => {
    expect(validateOrganization({ ...EXAMPLE_ORGANIZATION, nif: '1234' }).nif).toBe('O NIF tem 9 dígitos. Este tem 4.')
  })
})
