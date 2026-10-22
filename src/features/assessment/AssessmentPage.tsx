import { CheckCircle2, Clock, Lock } from 'lucide-react'
import { useAssessment, useUsers } from '../../api/queries'
import { MATURITY_LABEL } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import { PageTour } from '../../core/onboarding/PageTour'
import { Avatar, Card, Chip, ErrorState, Eyebrow, Explainer, NextSteps, Note, PageHeader, ProgressBar, SkeletonRows, Term } from '../../ui'

const STATUS = { em_curso: 'Em curso', submetida: 'Concluída · a aguardar validação', validada: 'Validada pela consultora' } as const

/** Rui's maturity assessment: summary per section and delegated questions. The questionnaire is another plugin. */
export function AssessmentPage() {
  const org = useTenant()
  const assessment = useAssessment(org.id)
  const users = useUsers(org.id)
  if (assessment.error) return <ErrorState error={assessment.error} onRetry={assessment.refetch} />
  const a = assessment.data
  const answered = a?.sections.reduce((n, s) => n + s.answered, 0) ?? 0
  const total = a?.sections.reduce((n, s) => n + s.total, 0) ?? 0
  const name = (id: string) => users.data?.find((u) => u.id === id)

  return (
    <>
      <PageHeader eyebrow={org.name} title="Avaliação" subtitle="Questionário de maturidade em cibersegurança, alinhado com o Decreto-Lei 125/2025 (NIS2)." help={<PageTour id="avaliacao" ready={!!a} />} />
      <Explainer id="assessment-client" intro={<>A avaliação mede a <Term k="maturidade">maturidade</Term> da empresa. Das respostas nascem as lacunas e o roadmap.</>}
        steps={[
          { title: 'Responda por secções', text: 'Não precisa de fazer tudo de uma vez. O progresso fica guardado.' },
          { title: 'Delegue o técnico', text: 'Perguntas que não sabe responder podem ir para o Pedro. Ele só vê essa pergunta.' },
          { title: 'A consultora valida', text: 'Quando concluir, a Marta revê as respostas e valida o roadmap.' },
        ]} />
      {!a ? <SkeletonRows rows={6} /> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex flex-col gap-4">
            <Card as="section" aria-labelledby="assessment-progress-title" className="flex flex-col gap-3" data-tour="assessment-progress">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Eyebrow as="h2"><span id="assessment-progress-title">Progresso</span></Eyebrow>
                <Chip tone={a.status === 'em_curso' ? 'signal' : 'neutral'}>{STATUS[a.status]}</Chip>
              </div>
              <p className="text-[28px] font-extrabold">{answered} <span className="text-[16px] font-semibold text-ink-soft">de {total} perguntas respondidas</span></p>
              <ProgressBar value={answered} max={total} label="Progresso da avaliação" />
              {a.maturity && <p className="text-[14px]"><Term k="maturidade">Nível de maturidade</Term>: <strong>{a.maturity} de 5</strong> · {MATURITY_LABEL[a.maturity]}</p>}
            </Card>
            <section aria-labelledby="assessment-sections-title" className="flex flex-col gap-3" data-tour="assessment-sections">
              <h2 id="assessment-sections-title" className="section-title mt-2">Secções</h2>
              <ul className="flex flex-col gap-3">
                {a.sections.map((s) => {
                  const complete = s.answered === s.total
                  return (
                    <li key={s.id}>
                      <Card className="flex flex-col gap-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="flex items-center gap-2 text-[15px] font-bold">
                            {complete ? <CheckCircle2 className="size-4 text-brand" aria-hidden /> : <Clock className="size-4 text-muted" aria-hidden />}
                            {s.name}
                            <span className="sr-only">({complete ? 'completa' : 'por completar'})</span>
                          </h3>
                          <span className="shrink-0 text-[13px] text-ink-soft">{s.answered}/{s.total}<span className="sr-only"> perguntas respondidas</span></span>
                        </div>
                        <ProgressBar value={s.answered} max={s.total} label={`Progresso de ${s.name}`} />
                        {s.delegated.map((d) => {
                          const u = name(d.assigneeId)
                          return (
                            <p key={d.taskId} className="flex items-center gap-2 text-[13px] text-ink-soft">
                              {u && <Avatar initials={u.initials} size={24} />}
                              <span>1 pergunta delegada {u ? `ao ${u.name}` : ''}: <strong className={d.status === 'concluida' ? 'text-brand' : 'text-ink'}>{d.status === 'concluida' ? 'respondida' : 'à espera de resposta'}</strong></span>
                            </p>
                          )
                        })}
                      </Card>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>
          <aside aria-label="Próximos passos da avaliação" className="flex flex-col gap-4" data-tour="assessment-next">
            <NextSteps steps={[
              { label: 'Responder a todas as secções', done: a.status !== 'em_curso', hint: a.status === 'em_curso' ? `Faltam ${total - answered} perguntas.` : undefined },
              { label: 'Receber as respostas do Pedro', done: a.sections.every((s) => s.delegated.every((d) => d.status === 'concluida')) },
              { label: 'Validação pela consultora', done: a.status === 'validada', hint: 'A Marta revê as respostas e valida o roadmap.' },
              { label: 'Ver resultados e roadmap', done: false, to: a.status === 'validada' ? `/org/${org.slug}/roadmap` : undefined, cta: 'Abrir' },
            ]} />
            <Note><Lock className="mr-1 inline size-3.5 align-[-2px]" aria-hidden />O questionário completo faz parte do plugin Avaliação e não está incluído neste protótipo de Riscos e Ativos.</Note>
          </aside>
        </div>
      )}
    </>
  )
}
