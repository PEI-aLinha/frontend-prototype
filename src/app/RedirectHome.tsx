import { useEffect, useRef } from 'react'
import { Navigate } from 'react-router'
import { homePath } from '../core/personas'
import { useSession } from '../core/session'
import { useToast } from '../ui'

/** Sends a person to their home and says why, instead of a silent jump. */
export function RedirectHome({ reason }: { reason: string }) {
  const { persona } = useSession()
  const toast = useToast()
  const shown = useRef(false)
  useEffect(() => {
    if (shown.current) return
    shown.current = true
    toast.show(reason, 'info')
  }, [reason, toast])
  return <Navigate to={homePath(persona.key)} replace />
}
