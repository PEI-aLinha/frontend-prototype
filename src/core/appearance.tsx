import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CVD_KEY, DARK_QUERY, THEME_KEY, THEMES, VISIONS, readStored, resolveTheme, systemPrefersDark, writeStored, type ColorVision, type ResolvedTheme, type ThemePreference } from './appearanceModel'

export type { ColorVision, ResolvedTheme, ThemePreference } from './appearanceModel'

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
