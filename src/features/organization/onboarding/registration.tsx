import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/** Account data kept between onboarding steps. The password never leaves the form. */
export interface AccountDraft {
  name: string
  email: string
}

interface RegistrationValue {
  account: AccountDraft | null
  setAccount: (account: AccountDraft) => void
}

const RegistrationContext = createContext<RegistrationValue | null>(null)

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AccountDraft | null>(null)
  const value = useMemo(() => ({ account, setAccount }), [account])
  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRegistration(): RegistrationValue {
  const ctx = useContext(RegistrationContext)
  if (!ctx) throw new Error('useRegistration must be used within RegistrationProvider')
  return ctx
}
