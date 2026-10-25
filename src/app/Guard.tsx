import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Lock } from 'lucide-react'
import { useRoadmapStatus } from '../api/queries'
import type { Action, Resource } from '../core/rbac'
import { homePath } from '../core/personas'
import { useSession } from '../core/session'
import { useOptionalTenant } from '../core/tenant'
import { useCan } from '../core/useCan'
import { EmptyState, ErrorState, SkeletonRows } from '../ui'

/** Guards a screen by role (RNF08). */
export function Guard({ resource, action = 'view', children, reason }: { resource: Resource; action?: Action; children: ReactNode; reason?: string }) {
  const can = useCan()
  const { persona } = useSession()
  const org = useOptionalTenant()
  const status = useRoadmapStatus(resource === 'risk' ? org?.id : undefined)
  // The risk screen depends on the roadmap validation. Pending is not the same as denied.
  if (resource === 'risk') {
    if (status.isPending) return <SkeletonRows rows={6} />
    if (status.isError) return <ErrorState error={status.error} onRetry={() => status.refetch()} />
  }
  if (can(action, resource)) return <>{children}</>
  return (
    <EmptyState icon={<Lock className="size-5" aria-hidden />} title="Este ecrã não está disponível para o seu papel" action={<Link to={homePath(persona.key)} className="text-[0.875rem] font-bold text-brand hover:underline">Voltar ao início</Link>}>
      {reason ?? 'O aLinha mostra a cada pessoa só o que precisa para o seu trabalho.'}
    </EmptyState>
  )
}
