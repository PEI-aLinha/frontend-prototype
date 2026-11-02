import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'
export type ColorVision = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'

export const THEME_KEY = 'appearance.theme'
export const CVD_KEY = 'appearance.cvd'
const DARK_QUERY = '(prefers-color-scheme: dark)'

const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark']
const VISIONS: readonly ColorVision[] = ['none', 'protanopia', 'deuteranopia', 'tritanopia']

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback
  } catch {
    return fallback
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked (private mode): the choice still applies for this session.
  }
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
}

export function resolveTheme(pref: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (pref === 'system') return prefersDark ? 'dark' : 'light'
  return pref
}

interface AppearanceValue {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  cvd: ColorVision
  setTheme: (theme: ThemePreference) => void
  setCvd: (cvd: ColorVision) => void
}

const AppearanceContext = createContext<AppearanceValue | null>(null)

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => readStored(THEME_KEY, THEMES, 'system'))
  const [cvd, setCvdState] = useState<ColorVision>(() => readStored(CVD_KEY, VISIONS, 'none'))
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia(DARK_QUERY)
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme = resolveTheme(theme, prefersDark)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = resolvedTheme
    if (cvd === 'none') delete root.dataset.cvd
    else root.dataset.cvd = cvd
  }, [resolvedTheme, cvd])

  const setTheme = useCallback((next: ThemePreference) => {
    writeStored(THEME_KEY, next)
    setThemeState(next)
  }, [])
  const setCvd = useCallback((next: ColorVision) => {
    writeStored(CVD_KEY, next)
    setCvdState(next)
  }, [])

  const value = useMemo(() => ({ theme, resolvedTheme, cvd, setTheme, setCvd }), [theme, resolvedTheme, cvd, setTheme, setCvd])
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppearance(): AppearanceValue {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearance must be used inside <AppearanceProvider>')
  return ctx
}
