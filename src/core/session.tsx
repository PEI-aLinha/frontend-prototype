import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setActor } from '../api/client'
import { isPersonaKey, PERSONAS, type Persona, type PersonaKey } from './personas'

const STORAGE_KEY = 'alinha-persona'
const IDENTITY_KEY = 'alinha-identity'

/** Someone who joined during the demo (e.g. an analyst who accepted an invitation), shown in a persona's role. */
export type Identity = Pick<Persona, 'userId' | 'name' | 'firstName' | 'initials'>

interface SessionValue {
  persona: Persona
  setPersona: (key: PersonaKey) => void
  /** Signs in as a person created during the demo, keeping the role of the given persona. */
  signInAs: (key: PersonaKey, identity: Identity) => void
}

function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY)
    return raw ? (JSON.parse(raw) as Identity) : null
  } catch {
    return null
  }
}

const SessionContext = createContext<SessionValue | null>(null)

function initialPersona(): PersonaKey {
  const fromUrl = new URLSearchParams(window.location.search).get('as')
  if (isPersonaKey(fromUrl)) return fromUrl
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isPersonaKey(stored)) return stored
  } catch {
    // no localStorage: start as Rui.
  }
  return 'rui'
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const fromUrl = isPersonaKey(new URLSearchParams(window.location.search).get('as'))
  const [identity, setIdentity] = useState<Identity | null>(() => (fromUrl ? null : loadIdentity()))
  const [key, setKey] = useState<PersonaKey>(() => {
    const k = initialPersona()
    setActor({ userId: (fromUrl ? null : loadIdentity())?.userId ?? PERSONAS[k].userId })
    return k
  })

  const switchTo = useCallback((next: PersonaKey, who: Identity | null) => {
    setActor({ userId: who?.userId ?? PERSONAS[next].userId })
    try {
      localStorage.setItem(STORAGE_KEY, next)
      if (who) localStorage.setItem(IDENTITY_KEY, JSON.stringify(who))
      else localStorage.removeItem(IDENTITY_KEY)
    } catch {
      // ignored
    }
    qc.clear()
    setIdentity(who)
    setKey(next)
  }, [qc])

  const setPersona = useCallback((next: PersonaKey) => switchTo(next, null), [switchTo])
  const signInAs = useCallback((next: PersonaKey, who: Identity) => switchTo(next, who), [switchTo])

  const value = useMemo(() => ({ persona: { ...PERSONAS[key], ...identity }, setPersona, signInAs }), [key, identity, setPersona, signInAs])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}
