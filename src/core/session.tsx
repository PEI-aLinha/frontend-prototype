import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setActor } from '../api/client'
import { isPersonaKey, PERSONAS, type Persona, type PersonaKey } from './personas'

const STORAGE_KEY = 'alinha-persona'

interface SessionValue {
  persona: Persona
  setPersona: (key: PersonaKey) => void
}

const SessionContext = createContext<SessionValue | null>(null)

function initialPersona(): PersonaKey {
  const fromUrl = new URLSearchParams(window.location.search).get('as')
  if (isPersonaKey(fromUrl)) return fromUrl
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isPersonaKey(stored)) return stored
  } catch {
    // sem localStorage: começa como Rui.
  }
  return 'rui'
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [key, setKey] = useState<PersonaKey>(() => {
    const k = initialPersona()
    setActor({ userId: PERSONAS[k].userId })
    return k
  })

  const setPersona = useCallback((next: PersonaKey) => {
    setActor({ userId: PERSONAS[next].userId })
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignorado
    }
    qc.clear()
    setKey(next)
  }, [qc])

  const value = useMemo(() => ({ persona: PERSONAS[key], setPersona }), [key, setPersona])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession fora de SessionProvider')
  return ctx
}
