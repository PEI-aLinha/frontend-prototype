import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppearanceProvider, CVD_KEY, THEME_KEY, resolveTheme, useAppearance } from './appearance'

function mockMatchMedia(dark: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  const mql = { matches: dark, addEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => listeners.add(l), removeEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => listeners.delete(l) }
  vi.stubGlobal('matchMedia', vi.fn(() => mql))
  return (next: boolean) => listeners.forEach((l) => l({ matches: next } as MediaQueryListEvent))
}

function Probe() {
  const { theme, resolvedTheme, cvd, setTheme, setCvd } = useAppearance()
  return (
    <>
      <p>{`${theme}|${resolvedTheme}|${cvd}`}</p>
      <button onClick={() => setTheme('dark')}>dark</button>
      <button onClick={() => setCvd('tritanopia')}>trit</button>
      <button onClick={() => setCvd('none')}>none</button>
    </>
  )
}

const html = document.documentElement

describe('appearance', () => {
  beforeEach(() => { localStorage.clear(); delete html.dataset.theme; delete html.dataset.cvd })
  afterEach(() => vi.unstubAllGlobals())

  it('resolves system preference', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('defaults to system and follows OS changes', () => {
    const emit = mockMatchMedia(false)
    render(<AppearanceProvider><Probe /></AppearanceProvider>)
    expect(screen.getByText('system|light|none')).toBeTruthy()
    expect(html.dataset.theme).toBe('light')
    act(() => emit(true))
    expect(html.dataset.theme).toBe('dark')
  })

  it('persists choices and applies attributes', () => {
    mockMatchMedia(false)
    render(<AppearanceProvider><Probe /></AppearanceProvider>)
    act(() => screen.getByText('dark').click())
    act(() => screen.getByText('trit').click())
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    expect(localStorage.getItem(CVD_KEY)).toBe('tritanopia')
    expect(html.dataset.theme).toBe('dark')
    expect(html.dataset.cvd).toBe('tritanopia')
    act(() => screen.getByText('none').click())
    expect(html.dataset.cvd).toBeUndefined()
  })

  it('restores stored values and ignores invalid ones', () => {
    mockMatchMedia(false)
    localStorage.setItem(THEME_KEY, 'dark')
    localStorage.setItem(CVD_KEY, 'bogus')
    render(<AppearanceProvider><Probe /></AppearanceProvider>)
    expect(screen.getByText('dark|dark|none')).toBeTruthy()
  })
})
