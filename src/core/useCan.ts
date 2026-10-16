import { useRoadmapStatus } from '../api/queries'
import { canRole, type Action, type Resource } from './rbac'
import { useSession } from './session'
import { useOptionalTenant } from './tenant'

/** can(action, resource) for the current user, in the context of the active organization. */
export function useCan(): (action: Action, resource: Resource) => boolean {
  const { persona } = useSession()
  const org = useOptionalTenant()
  const roadmap = useRoadmapStatus(org?.id)
  return (action, resource) => canRole(persona.role, action, resource, { roadmapValidated: roadmap.data?.validated })
}
