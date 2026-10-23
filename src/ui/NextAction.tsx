import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'

interface NextActionProps {
  title: string
  text: string
  cta: string
  /** Internal route; use `onClick` instead for actions that open a drawer or modal. */
  to?: string
  onClick?: () => void
}

const CTA_CLASS = 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[10px] bg-paper px-4 py-2.5 text-[0.875rem] font-bold text-brand hover:bg-signal-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper max-md:w-full'

/** The single most important next step on a page: the only filled surface, so it leads the eye. */
export function NextAction({ title, text, cta, to, onClick }: NextActionProps) {
  const content = <>{cta}<ArrowRight className="size-4" aria-hidden /></>
  return (
    <section aria-label="Próxima ação" className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-[16px] bg-brand px-6 py-5 text-white">
      <div className="min-w-0 flex-1">
        <p className="text-[0.75rem] font-extrabold uppercase tracking-wide opacity-80">Próxima ação</p>
        <h2 className="mt-1 text-[1.125rem] font-extrabold">{title}</h2>
        <p className="mt-0.5 max-w-[640px] text-[0.875rem] opacity-90">{text}</p>
      </div>
      {to ? <Link to={to} className={CTA_CLASS}>{content}</Link> : <button type="button" onClick={onClick} className={CTA_CLASS}>{content}</button>}
    </section>
  )
}
