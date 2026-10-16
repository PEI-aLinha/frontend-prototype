import { Navigate } from 'react-router'
import { homePath } from '../core/personas'
import { useSession } from '../core/session'

export function HomeRedirect() {
  const { persona } = useSession()
  return <Navigate to={homePath(persona.key)} replace />
}
