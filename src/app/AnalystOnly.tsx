import type { ReactNode } from 'react'
import { useSession } from '../core/session'
import { RedirectHome } from './RedirectHome'

/** "My tasks" is the analyst's space; other roles are sent back to their home, with a word on why. */
export function AnalystOnly({ children }: { children: ReactNode }) {
  const { persona } = useSession()
  if (persona.role !== 'analista') return <RedirectHome reason="As tarefas técnicas são do analista. Voltou ao seu início." />
  return <>{children}</>
}
