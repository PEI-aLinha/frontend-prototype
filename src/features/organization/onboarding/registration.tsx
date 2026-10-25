import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Organization } from '../../../api/contracts'
import type { OrganizationForm } from './organizationForm'

/** Account data kept between onboarding steps. The password never leaves the form. */
export interface AccountDraft {
  name: string
  email: string
}

interface Draft {
  account: AccountDraft | null
  mfaVerified: boolean
  organization: OrganizationForm | null
}

interface RegistrationValue extends Draft {
  setAccount: (account: AccountDraft) => void
  setMfaVerified: (verified: boolean) => void
  setOrganization: (organization: OrganizationForm) => void
  /** True when the draft came back from a previous visit ("guardar e continuar"). */
  restored: boolean
  registered: Organization | null
  finish: (organization: Organization) => void
}

const STORAGE_KEY = 'alinha-registration-draft'
const EMPTY: Draft = { account: null, mfaVerified: false, organization: null }

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Draft) } : null
  } catch {
    return null
  }
}

/** Demo only: called when the demo data is reset. */
// eslint-disable-next-line react-refresh/only-export-components
export function clearRegistrationDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignored
  }
}

const RegistrationContext = createContext<RegistrationValue | null>(null)

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadDraft)
  const [draft, setDraft] = useState<Draft>(initial ?? EMPTY)
  const [registered, setRegistered] = useState<Organization | null>(null)

  // The draft (never the password) is saved on every change, so the user can come back later.
  useEffect(() => {
    if (registered || !draft.account) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // No localStorage: the draft lives only in memory.
    }
  }, [draft, registered])

  const finish = useCallback((organization: Organization) => {
    clearRegistrationDraft()
    setRegistered(organization)
    setDraft(EMPTY)
  }, [])

  const value = useMemo<RegistrationValue>(() => ({
    ...draft,
    setAccount: (account) => setDraft((d) => ({ ...d, account })),
    setMfaVerified: (mfaVerified) => setDraft((d) => ({ ...d, mfaVerified })),
    setOrganization: (organization) => setDraft((d) => ({ ...d, organization })),
    restored: !!initial?.account,
    registered,
    finish,
  }), [draft, initial, registered, finish])

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRegistration(): RegistrationValue {
  const ctx = useContext(RegistrationContext)
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider')
  return ctx
}
