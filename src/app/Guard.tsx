import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Clock, EyeOff } from 'lucide-react'
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
  // The designated manager is not denied the risks: they open once the consultant validates the roadmap.
  if (resource === 'risk' && persona.role === 'responsavel' && !status.data?.validated) {
    return (
      <EmptyState headingLevel={1} icon={<Clock className="size-5" aria-hidden />} title="Os riscos ainda não estão disponíveis" action={org && <Link to={`/org/${org.slug}/roadmap`} className="text-[0.9375rem] font-bold text-brand hover:underline">Ver o estado do roadmap</Link>}>
        A consultora regista os riscos e valida-os com o roadmap. Recebe uma notificação quando os puder ver.
      </EmptyState>
    )
  }
  return (
    <EmptyState headingLevel={1} icon={<EyeOff className="size-5" aria-hidden />} title="Este ecrã não está disponível para o seu papel" action={<Link to={homePath(persona.key)} className="text-[0.9375rem] font-bold text-brand hover:underline">Voltar ao início</Link>}>
      {reason ?? 'O aLinha mostra a cada pessoa só o que precisa para o seu trabalho.'}
    </EmptyState>
  )
}
