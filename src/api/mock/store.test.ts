import { beforeEach, describe, expect, it } from 'vitest'
import { getState, now, resetDemo } from './store'

describe('demo clock', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemo('c2')
  })

  it('stamps writes on the scenario day, so they line up with seeded dates and deadlines', () => {
    expect(now().slice(0, 10)).toBe(getState().today)
  })

  it('keeps the real time of day, so two writes in a row stay in order', () => {
    const stamp = new Date(now())
    const real = new Date()
    expect(stamp.getHours()).toBe(real.getHours())
  })
})
