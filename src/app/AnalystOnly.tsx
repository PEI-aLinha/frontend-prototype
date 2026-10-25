import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { homePath } from '../core/personas'
import { useSession } from '../core/session'

/** "My tasks" is the analyst's space; other roles are sent back to their home. */
export function AnalystOnly({ children }: { children: ReactNode }) {
  const { persona } = useSession()
  if (persona.role !== 'analista') return <Navigate to={homePath(persona.key)} replace />
  return <>{children}</>
}
