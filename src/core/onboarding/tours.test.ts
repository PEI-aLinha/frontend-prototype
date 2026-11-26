import { describe, expect, it } from 'vitest'
import { TOURS } from './tours'

// Every screen's source, as text: a tour step whose anchor no longer exists is silently skipped.
const sources = Object.values(import.meta.glob('/src/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>).join('\n')

describe('guided tours', () => {
  const steps = Object.entries(TOURS).flatMap(([tour, list]) => list.filter((s) => s.target).map((s) => [tour, s.target!] as const))

  it.each(steps)('%s: the "%s" anchor exists on a screen', (_, target) => {
    expect(sources).toContain(`data-tour="${target}"`)
  })
})
