import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    expect(stamp.getUTCHours()).toBe(real.getUTCHours())
  })

  describe('near midnight, in a timezone far from UTC', () => {
    const tz = process.env.TZ
    afterEach(() => {
      vi.useRealTimers()
      process.env.TZ = tz
    })

    it.each(['2026-03-01T23:30:00Z', '2026-03-01T00:30:00Z'])('still stamps the scenario day at %s', (at) => {
      process.env.TZ = 'Pacific/Kiritimati' // UTC+14
      vi.useFakeTimers()
      vi.setSystemTime(new Date(at))
      expect(now().slice(0, 10)).toBe(getState().today)
      expect(now().slice(11)).toBe(at.slice(11, 19) + '.000Z')
    })
  })
})
