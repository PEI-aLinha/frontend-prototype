import { createContext, useContext, type ReactNode } from 'react'
import type { Organization } from '../api/contracts'

const TenantContext = createContext<Organization | null>(null)

export function TenantProvider({ org, children }: { org: Organization; children: ReactNode }) {
  return <TenantContext.Provider value={org}>{children}</TenantContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTenant(): Organization {
  const org = useContext(TenantContext)
  if (!org) throw new Error('useTenant must be used within TenantProvider')
  return org
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOptionalTenant(): Organization | null {
  return useContext(TenantContext)
}
