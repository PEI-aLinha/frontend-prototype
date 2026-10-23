import { describe, expect, it } from 'vitest'
import { examplePassword, passwordIsValid } from './password'

describe('examplePassword', () => {
  it('always meets the password rules', () => {
    for (let i = 0; i < 200; i++) expect(passwordIsValid(examplePassword())).toBe(true)
  })
})
