import { Construction } from 'lucide-react'
import { EmptyState, PageHeader } from '../ui'

export function OutOfScope({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} />
      <EmptyState icon={<Construction className="size-5" aria-hidden />} title="Fora deste protótipo">
        Este protótipo cobre o plugin Riscos e Ativos. Este ecrã existe no produto, mas não faz parte destes testes.
      </EmptyState>
    </>
  )
}
