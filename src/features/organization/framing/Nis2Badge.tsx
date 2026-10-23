import { BadgeCheck, Info } from 'lucide-react'
import { Chip } from '../../../ui'

/** "Oficial · CNCS" once the Ato de Qualificação is registered; "Indicativo" for the suggestion. */
export function Nis2Badge({ official, onDark }: { official: boolean; onDark?: boolean }) {
  if (official) return <Chip tone={onDark ? 'signal' : 'dark'} icon={<BadgeCheck className="size-3.5" aria-hidden />}>Oficial · CNCS</Chip>
  return <Chip tone={onDark ? 'signal' : 'outline'} icon={<Info className="size-3.5" aria-hidden />}>Indicativo</Chip>
}
