/** Pure appearance helpers (kept apart from the provider so Fast Refresh stays component-only). */
export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'
export type ColorVision = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'

export const THEME_KEY = 'appearance.theme'
export const CVD_KEY = 'appearance.cvd'
export const DARK_QUERY = '(prefers-color-scheme: dark)'

export const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark']
export const VISIONS: readonly ColorVision[] = ['none', 'protanopia', 'deuteranopia', 'tritanopia']

export function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback
  } catch {
    return fallback
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked (private mode): the choice still applies for this session.
  }
}

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

export function resolveTheme(pref: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (pref === 'system') return prefersDark ? 'dark' : 'light'
  return pref
}
