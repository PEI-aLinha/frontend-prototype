import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router'
import { ArrowLeft, Check, UserRound, ArrowRight } from 'lucide-react'
import { ApiError, type AnswerChoice, type AssessmentQuestion, type Task, type TeamMember, type User } from '../../api/contracts'
import { useAssessment, useAssessmentQuestions, useDelegateQuestion, useMembers, useSaveAnswer, useTasks, useToday, useUpdateTask, useUsers } from '../../api/queries'
import { dateTime, shortDay } from '../../config/labels'
import { useTenant } from '../../core/tenant'
import { AIBadge, Button, Card, Chip, DateInput, EmptyState, ErrorState, Eyebrow, Field, Modal, Note, OptionGroup, PageHeader, ProgressBar, Select, SkeletonRows, TextArea, useToast } from '../../ui'
import { CHOICE_LABEL, CHOICES } from './choices'

const KIND_LABEL = { tecnica: 'Pergunta técnica', gestao: 'Pergunta de gestão' } as const

/** "às 17:44" when saved today, otherwise "a 16 out. · 15:40". */
/** "às 14:05" when saved on the demo's today (the scenario's date, not the computer's), otherwise the full date. */
function savedLabel(iso: string, today?: string) {
  const d = new Date(iso)
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (day !== (today ?? new Date().toISOString().slice(0, 10))) return `a ${dateTime(iso)}`
  return `às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Paths of the previous and next questions; undefined while unknown (or before the first question). */
interface Neighbours { prev?: string; next?: string }

/**
 * One assessment question: answer, save progress, or delegate it to an analyst.
 * The questions are one continuous flow (mockup 04/05); the section pages are an index into it.
 */
export function AssessmentQuestionPage() {
  const { sectionId = '', questionId = '' } = useParams()
  const org = useTenant()
  const navigate = useNavigate()
  const assessment = useAssessment(org.id)
  const questions = useAssessmentQuestions(org.id, sectionId)
  const tasks = useTasks(org.id)
  const users = useUsers(org.id)
  const today = useToday()
  const base = `/org/${org.slug}/avaliacao`
  const sections = assessment.data?.sections ?? []
  const at = sections.findIndex((s) => s.id === sectionId)
  const prevSection = at > 0 ? sections[at - 1] : undefined
  const nextSection = at >= 0 ? sections[at + 1] : undefined
  // The neighbouring sections, to cross into them from the first or last question.
  const prevQuestions = useAssessmentQuestions(prevSection && org.id, prevSection?.id ?? '')
  const nextQuestions = useAssessmentQuestions(nextSection && org.id, nextSection?.id ?? '')

  const error = assessment.error ?? questions.error
  if (error) return <ErrorState error={error} onRetry={() => { void assessment.refetch(); void questions.refetch() }} />
  if (!assessment.data || !questions.data) return <SkeletonRows rows={4} />
  const section = sections[at]
  const index = questions.data.findIndex((q) => q.id === questionId)
  const question = questions.data[index]
  if (!section || !question) return <EmptyState headingLevel={1} title="Pergunta não encontrada"><Link to={base} className="font-bold text-brand hover:underline">Voltar à avaliação</Link></EmptyState>

  const before = questions.data[index - 1] ?? prevQuestions.data?.at(-1)
  const after = questions.data[index + 1] ?? nextQuestions.data?.[0]
  const pathOf = (q?: AssessmentQuestion) => q && `${base}/${q.sectionId}/${q.id}`
  // After the very last question, "Seguinte" goes back to the overview of the sections.
  const nav: Neighbours = { prev: pathOf(before), next: pathOf(after) ?? (nextSection ? undefined : base) }
  const total = sections.reduce((n, s) => n + s.total, 0)
  const answered = sections.reduce((n, s) => n + s.answered, 0)
  const number = sections.slice(0, at).reduce((n, s) => n + s.total, 0) + index + 1
  const task = tasks.data?.find((t) => t.id === question.delegatedTaskId)
  const assignee = users.data?.find((u) => u.id === task?.assigneeId)
  const open = assessment.data.status === 'em_curso'
  const { savedAt } = assessment.data

  return (
    <>
      <Link to={base} className="-mb-4 inline-flex items-center gap-1.5 text-[0.9375rem] font-bold text-brand hover:underline"><ArrowLeft className="size-4" aria-hidden /><span className="sr-only">Voltar à </span>Avaliação</Link>
      <PageHeader eyebrow="Avaliação de maturidade · NIS2 + RGPD" title={`Pergunta ${number} de ${total}`}
        actions={
          // Always rendered, so screen readers announce it when a save fills it in.
          <p role="status" className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-ink-soft">
            {savedAt && <><Check className="size-4 text-signal" aria-hidden />Progresso guardado {savedLabel(savedAt, today.data)}</>}
          </p>
        } />
      <ProgressBar value={answered} max={total} label="Progresso da avaliação" className="-mt-2" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="flex flex-col gap-5 px-7 py-6 max-md:px-5">
          <div className="flex flex-col gap-2.5">
            <p className="flex flex-wrap items-center gap-2">
              <Chip tone={question.kind === 'tecnica' ? 'dark' : 'neutral'}>{KIND_LABEL[question.kind]}</Chip>
              <span className="text-[0.8125rem] font-semibold text-ink-soft">{section.name}</span>
            </p>
            <h2 className="text-[1.0625rem] font-extrabold leading-snug">{question.text}</h2>
          </div>
          {open
            ? <AnswerForm key={question.id} question={question} nav={nav} overviewPath={base} />
            : (
              <>
                <div className="rounded-[14px] bg-paper-soft p-4">
                  <Eyebrow>Resposta</Eyebrow>
                  <p className="mt-1 text-[1rem] font-bold">{question.answer ? CHOICE_LABEL[question.answer.choice] : 'Sem resposta'}</p>
                  {question.answer?.note && <p className="mt-1 text-[0.8125rem] text-ink-soft">"{question.answer.note}"</p>}
                  <p className="mt-3 text-[0.8125rem] text-muted">A avaliação já foi submetida. As respostas já não podem ser alteradas.</p>
                </div>
                <QuestionNav nav={nav} onGo={(path) => navigate(path)} />
              </>
            )}
        </Card>
        <aside className="flex flex-col gap-3">
          <AIHelp question={question} />
          <Delegation question={question} task={task} assignee={assignee} open={open} />
        </aside>
      </div>
    </>
  )
}

/** US33 explanation panel (mockup 04/05): AI help pre-generated per question, informational only. */
function AIHelp({ question }: { question: AssessmentQuestion }) {
  return (
    <section aria-labelledby="ajuda-ia" className="flex flex-col gap-3 rounded-[14px] border border-line-soft bg-paper p-5">
      <h2 id="ajuda-ia" className="section-title">O que significa esta pergunta?</h2>
      <p className="text-[0.9375rem] leading-relaxed text-ink-soft">{question.explanation}</p>
      <div className="rounded-[10px] bg-paper-soft px-4 py-3">
        <h3 className="text-[0.8125rem] font-bold">Exemplo</h3>
        <p className="text-[0.8125rem] leading-relaxed text-ink-soft">{question.example}</p>
      </div>
      <div>
        <h3 className="text-[0.8125rem] font-bold">Porque é importante</h3>
        <p className="text-[0.8125rem] leading-relaxed text-ink-soft">{question.whyItMatters}</p>
      </div>
      <div><AIBadge kind="info" /></div>
    </section>
  )
}

type Leaving = 'prev' | 'later' | 'next'

function AnswerForm({ question, nav, overviewPath }: { question: AssessmentQuestion; nav: Neighbours; overviewPath: string }) {
  const org = useTenant()
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSaveAnswer(org.id)
  const [choice, setChoice] = useState<AnswerChoice | null>(question.answer?.choice ?? null)
  const [note, setNote] = useState(question.answer?.note ?? '')
  const [leaving, setLeaving] = useState<Leaving>()
  // Only a new or changed answer is saved. Without an answer, moving on skips the question ("Por responder").
  const changed = !!choice && (choice !== question.answer?.choice || note.trim() !== (question.answer?.note ?? ''))

  // A comment typed before choosing an answer cannot be saved on its own, but it is still work the person did.
  const noteOnly = !choice && note.trim() !== (question.answer?.note ?? '')
  // Leaving by the sidebar, the browser's back button or a link saves the answer too: nothing typed is lost.
  const saving = useRef(false)
  // Which button led here, so the comment dialog names the move the person is making.
  const [intent, setIntent] = useState<Leaving>()
  const blocker = useBlocker(() => (changed || noteOnly) && !saving.current)
  useEffect(() => {
    // The effect runs again while the blocker is still "blocked": the ref makes sure one save, one proceed.
    if (blocker.state !== 'blocked' || !choice || saving.current) return
    saving.current = true
    save.mutateAsync({ questionId: question.id, answer: { choice, note } })
      .then(() => { toast.show('Resposta guardada.'); blocker.proceed?.() })
      .catch((e: unknown) => { saving.current = false; blocker.reset?.(); toast.show(saveError(e), 'error') })
  }, [blocker, choice, note, question.id, save, toast])
  // Keys 1–4 pick an answer and Enter goes on to the next question, except while typing or in a dialog.
  const form = useRef<HTMLFormElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || !/^([1-4]|Enter)$/.test(e.key)) return
      const t = e.target as HTMLElement
      if (t.closest('textarea, input:not([type="radio"]), select, [contenteditable="true"], [role="dialog"]')) return
      if (document.querySelector('[role="dialog"]')) return
      if (e.key === 'Enter') {
        // A focused button or link keeps its own Enter; anywhere else, Enter is "Seguinte".
        if (t.closest('button, a')) return
        e.preventDefault()
        form.current?.requestSubmit()
        return
      }
      const option = CHOICES[Number(e.key) - 1]
      if (!option) return
      e.preventDefault()
      setChoice(option.value)
      document.querySelector<HTMLInputElement>(`input[name="resposta"][value="${option.value}"]`)?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  // Closing the tab cannot wait for a save, so the browser asks first.
  useEffect(() => {
    if (!changed && !noteOnly) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [changed, noteOnly])

  const leave = (action: Leaving, path: string, message?: string, tone: 'success' | 'info' = 'success') => {
    setIntent(action)
    const go = () => { if (message && !noteOnly) toast.show(message, tone); void navigate(path) }
    if (!choice || !changed) { go(); return }
    saving.current = true
    setLeaving(action)
    // mutateAsync: navigating unmounts this form, and mutate() callbacks would be dropped.
    save.mutateAsync({ questionId: question.id, answer: { choice, note } })
      .then(go)
      .catch((e: unknown) => { saving.current = false; setLeaving(undefined); toast.show(saveError(e), 'error') })
  }

  return (
    <form ref={form} noValidate className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); if (nav.next && !leaving) leave('next', nav.next) }}>
      <OptionGroup name="resposta" legend="A sua resposta" value={choice} onChange={setChoice} options={CHOICES} columns={2} />
      <p className="-mt-3 text-[0.75rem] text-muted max-md:hidden">Pelo teclado: 1 a 4 escolhem a resposta, Enter passa à seguinte.</p>
      <Field label="Comentário" optional hint="Ajuda a consultora a perceber a resposta. Ex.: em que sistemas falta.">
        {(p) => <TextArea id={p.id} aria-describedby={p.describedBy} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />}
      </Field>
      {/* Moving on without an answer is allowed, but said: the question stays in the overview as "Por responder". */}
      <QuestionNav nav={nav} leaving={leaving} onGo={(path, action) => leave(action, path, action === 'next' && !choice && !question.answer ? 'Pergunta deixada por responder. Pode voltar a ela na Avaliação.' : undefined, 'info')}>
        <Button variant="secondary" loading={leaving === 'later'} disabled={!!leaving}
          onClick={() => leave('later', overviewPath, 'Progresso guardado. Pode continuar quando quiser.')}>Guardar e continuar depois</Button>
      </QuestionNav>
      <Modal open={blocker.state === 'blocked' && !choice} onOpenChange={(o) => { if (!o) { setIntent(undefined); blocker.reset?.() } }} width={440} title={MOVE[intent ?? 'away'].title}
        description="Escreveu um comentário mas ainda não escolheu uma resposta. Só é guardado com uma resposta."
        focusOnClose={() => document.querySelector<HTMLElement>('input[name="resposta"]')}
        footer={<>
          <Button variant="secondary" onClick={() => { setIntent(undefined); blocker.reset?.() }}>Escolher uma resposta</Button>
          <Button variant="danger" onClick={() => blocker.proceed?.()}>{MOVE[intent ?? 'away'].confirm}</Button>
        </>} />
    </form>
  )
}

const MOVE: Record<Leaving | 'away', { title: string; confirm: string }> = {
  next: { title: 'Avançar sem guardar o comentário?', confirm: 'Avançar sem guardar' },
  prev: { title: 'Recuar sem guardar o comentário?', confirm: 'Recuar sem guardar' },
  later: { title: 'Sair sem guardar o comentário?', confirm: 'Sair sem guardar' },
  away: { title: 'Sair sem guardar o comentário?', confirm: 'Sair sem guardar' },
}

/** Errors from the API are already written for people; anything else gets a plain sentence instead of developer text. */
function saveError(e: unknown): string {
  return e instanceof ApiError ? e.message : 'Não foi possível guardar a resposta. Tente de novo.'
}

/** ← Anterior on the left; Seguinte → (and any extra action) on the right. */
function QuestionNav({ nav, leaving, onGo, children }: { nav: Neighbours; leaving?: Leaving; onGo: (path: string, action: 'prev' | 'next') => void; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button variant="secondary" loading={leaving === 'prev'} disabled={!nav.prev || !!leaving} icon={<ArrowLeft className="size-4" aria-hidden />} onClick={() => nav.prev && onGo(nav.prev, 'prev')}>Anterior</Button>
      <div className="flex flex-wrap justify-end gap-2">
        {children}
        <Button loading={leaving === 'next'} disabled={!nav.next || !!leaving} onClick={() => nav.next && onGo(nav.next, 'next')}>Seguinte <ArrowRight className="size-4" aria-hidden /></Button>
      </div>
    </div>
  )
}

function Delegation({ question, task, assignee, open }: { question: AssessmentQuestion; task?: Task; assignee?: User; open: boolean }) {
  const org = useTenant()
  const members = useMembers(org.id)
  const [delegating, setDelegating] = useState(false)
  const toast = useToast()
  const cancel = useUpdateTask(org.id)
  const analysts = members.data?.filter((m) => m.role === 'analista' && m.status === 'ativo' && m.userId) ?? []
  const who = assignee?.name ?? 'analista'

  if (task?.status === 'pendente') {
    // Withdrawing the request gives the question back, to answer here or delegate to someone else.
    const withdraw = () => cancel.mutate({ id: task.id, change: { status: 'cancelada' } }, {
      onSuccess: () => toast.show(`Pedido a ${who} cancelado. Pode responder aqui ou delegar a outra pessoa.`),
      onError: (e) => toast.show(e.message, 'error'),
    })
    return (
      <Note icon={false}>
        <span className="flex flex-wrap items-start gap-2"><UserRound className="mt-[2px] size-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">Delegada a {who}: à espera de resposta{task.dueDate ? ` (prazo ${shortDay(task.dueDate)})` : ''}. Só vê esta pergunta.</span>
          {open && <Button size="sm" variant="ghost" loading={cancel.isPending} onClick={withdraw}>Cancelar pedido</Button>}
        </span>
      </Note>
    )
  }
  if (task?.status === 'concluida') {
    return (
      <section aria-label="Resposta do analista" className="flex flex-col gap-1.5 rounded-[16px] border border-line-soft bg-paper p-5">
        <Eyebrow>Resposta de {who}</Eyebrow>
        <p className="text-[1rem] font-bold">{task.answer ? CHOICE_LABEL[task.answer.choice] : '—'}</p>
        {task.answer?.note && <p className="text-[0.8125rem] text-ink-soft">"{task.answer.note}"</p>}
        {open && <p className="mt-1 text-[0.75rem] text-muted">Pode guardar esta resposta ou responder de outra forma.</p>}
      </section>
    )
  }
  // Delegated, but the task is still loading: do not offer to delegate it again.
  if (!open || !members.data || question.delegatedTaskId) return null
  if (analysts.length === 0) {
    return <Note>Para delegar uma pergunta técnica, convide um analista em <Link to={`/org/${org.slug}/equipa`} className="underline">Equipa</Link>.</Note>
  }
  return (
    <section aria-label="Delegar" className="flex flex-col gap-2.5 rounded-[16px] border border-line-soft bg-paper p-5">
      <h2 className="text-[0.9375rem] font-extrabold">Não sabe responder?</h2>
      <p className="text-[0.8125rem] text-ink-soft">Envie a pergunta a quem saiba. Recebe a resposta aqui.</p>
      <Button variant="secondary" onClick={() => setDelegating(true)}>{analysts.length === 1 ? `Delegar a ${analysts[0].name}` : 'Delegar a um analista'}</Button>
      {delegating && <DelegateModal question={question} analysts={analysts} onClose={() => setDelegating(false)} />}
    </section>
  )
}

function DelegateModal({ question, analysts, onClose }: { question: AssessmentQuestion; analysts: TeamMember[]; onClose: () => void }) {
  const org = useTenant()
  const toast = useToast()
  const today = useToday()
  const delegate = useDelegateQuestion(org.id)
  const [assignee, setAssignee] = useState(analysts.length === 1 ? analysts[0].userId! : '')
  const [due, setDue] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const errors = {
    assignee: submitted && !assignee ? 'Escolha o analista.' : undefined,
    due: submitted && due && today.data && due < today.data ? 'O prazo não pode ser no passado.' : undefined,
  }
  const submit = () => {
    setSubmitted(true)
    if (!assignee || (due && today.data && due < today.data)) return
    // mutateAsync: once the refetch marks the question as delegated, this dialog unmounts and mutate() callbacks would be dropped.
    delegate.mutateAsync({ questionId: question.id, input: { assigneeId: assignee, dueDate: due || null } })
      .then(() => { toast.show(`Pergunta enviada a ${analysts.find((a) => a.userId === assignee)?.name}`); onClose() })
      .catch(() => {}) // The error is shown in the dialog (delegate.isError).
  }

  return (
    <Modal open onOpenChange={(o) => !o && onClose()} chip={<Chip>Pergunta técnica</Chip>} title="Delegar pergunta"
      description="O analista recebe um email e só vê esta pergunta."
      footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit} loading={delegate.isPending}>Enviar</Button></>}>
      <p className="rounded-[12px] bg-paper-soft p-4 text-[0.9375rem] font-bold leading-snug">{question.text}</p>
      {analysts.length > 1 ? (
        <Field label="Analista" error={errors.assignee}>
          {(p) => <Select id={p.id} describedBy={p.describedBy} invalid={p.invalid} value={assignee} placeholder="Escolher o analista…" onChange={setAssignee} options={analysts.map((a) => ({ value: a.userId!, label: a.name, hint: a.email }))} />}
        </Field>
      ) : (
        <p className="text-[0.9375rem]">Para: <strong>{analysts[0].name}</strong></p>
      )}
      <Field label="Prazo" optional hint="Sem prazo, a pergunta fica sem data limite." error={errors.due} className="max-w-[260px]">
        {(p) => <DateInput id={p.id} aria-describedby={p.describedBy} invalid={p.invalid} min={today.data} value={due} onChange={(e) => setDue(e.target.value)} />}
      </Field>
      {delegate.isError && <p role="alert" className="rounded-[10px] bg-risk-high px-3.5 py-2.5 text-[0.8125rem] font-semibold text-risk-high-ink">{delegate.error.message}</p>}
    </Modal>
  )
}
