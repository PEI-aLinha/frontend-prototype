import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { homePath } from '../core/personas'
import { useSession } from '../core/session'

/** "As minhas tarefas" é o espaço do analista; os outros papéis voltam ao seu início. */
export function AnalystOnly({ children }: { children: ReactNode }) {
  const { persona } = useSession()
  if (persona.role !== 'analista') return <Navigate to={homePath(persona.key)} replace />
  return <>{children}</>
}
