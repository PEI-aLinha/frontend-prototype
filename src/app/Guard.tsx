import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Lock } from 'lucide-react'
import type { Action, Resource } from '../core/rbac'
import { homePath } from '../core/personas'
import { useSession } from '../core/session'
import { useCan } from '../core/useCan'
import { EmptyState } from '../ui'

/** Guards a screen by role (RNF08). */
export function Guard({ resource, action = 'view', children, reason }: { resource: Resource; action?: Action; children: ReactNode; reason?: string }) {
  const can = useCan()
  const { persona } = useSession()
  if (can(action, resource)) return <>{children}</>
  return (
    <EmptyState icon={<Lock className="size-5" aria-hidden />} title="Este ecrã não está disponível para o seu papel" action={<Link to={homePath(persona.key)} className="text-[0.875rem] font-bold text-brand hover:underline">Voltar ao início</Link>}>
      {reason ?? 'O aLinha mostra a cada pessoa só o que precisa para o seu trabalho.'}
    </EmptyState>
  )
}
