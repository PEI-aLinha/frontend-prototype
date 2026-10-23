import { describe, expect, it } from 'vitest'
import type { User } from '../api/contracts'
import { authorNames } from './labels'

const rui: User = { id: 'u-rui', name: 'Rui Santos', initials: 'RS', role: 'responsavel', title: '', email: '' }
const pedro: User = { id: 'u-pedro', name: 'Pedro Almeida', initials: 'PA', role: 'analista', title: '', email: '' }
const ana: User = { id: 'u-ana', name: 'Ana Costa', initials: 'AC', role: 'analista', title: '', email: '' }
const users = [rui, pedro, ana]

const by = (...ids: string[]) => ids.map((createdBy) => ({ createdBy }))

describe('authorNames', () => {
  it('joins two people with "e"', () => {
    expect(authorNames(by('u-rui', 'u-pedro'), users)).toBe('Rui Santos e Pedro Almeida')
  })

  it('joins three or more with commas before the last', () => {
    expect(authorNames(by('u-rui', 'u-pedro', 'u-ana'), users)).toBe('Rui Santos, Pedro Almeida e Ana Costa')
  })

  it('names a single person without joining anything', () => {
    expect(authorNames(by('u-pedro'), users)).toBe('Pedro Almeida')
  })

  it('counts each person once', () => {
    expect(authorNames(by('u-rui', 'u-pedro', 'u-rui', 'u-pedro', 'u-rui'), users)).toBe('Rui Santos e Pedro Almeida')
  })

  it('returns nothing when the inventory is empty or nobody is known', () => {
    expect(authorNames([], users)).toBe('')
    expect(authorNames(by('u-ninguem'), users)).toBe('')
  })

  it('skips the unknown without joining around it', () => {
    expect(authorNames(by('u-rui', 'u-ninguem', 'u-pedro'), users)).toBe('Rui Santos e Pedro Almeida')
    expect(authorNames(by('u-ninguem', 'u-rui'), users)).toBe('Rui Santos')
  })
})