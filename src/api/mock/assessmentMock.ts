import { ApiError, type AssessmentApi, type AssessmentQuestion, type DemoActor, type Id, type Task } from '../contracts'
import { shortDayPt } from './dates'
import { notify } from './notify'
import type { DemoState } from './seed'
import catalog from './assessmentCatalog.json'
import { auditEntry, getState, newId, now, setState, simulate } from './store'

/** Maturity assessment sections. */
const SECTIONS: Array<{ id: Id; name: string }> = [
  { id: 'sec-gov', name: 'Governação e responsabilidades' },
  { id: 'sec-ativos', name: 'Gestão de ativos' },
  { id: 'sec-acessos', name: 'Controlo de acessos' },
  { id: 'sec-continuidade', name: 'Continuidade do negócio' },
  { id: 'sec-incidentes', name: 'Gestão de incidentes' },
  { id: 'sec-fornecedores', name: 'Fornecedores e cadeia de abastecimento' },
]

type QuestionDef = Omit<AssessmentQuestion, 'answer' | 'delegatedTaskId'>

/**
 * Questionnaire catalog (mock data in assessmentCatalog.json). The explanation, example and "why it matters" stand in for the AI help that
 * the real service pre-generates per question (informational only). The answers live in DemoState.answers or in the analyst's task.
 */
const QUESTIONS = catalog as QuestionDef[]

const CHOICE_LABEL = { sim: 'Sim', parcial: 'Em parte', nao: 'Não', nao_sei: 'Não sei' } as const

/** Latest analyst task for a question, unless it was cancelled. */
const delegation = (s: DemoState, questionId: Id) => s.tasks.findLast((t) => t.questionId === questionId && t.status !== 'cancelada')

/** The designated manager's own answer wins; otherwise the analyst's, once they reply. */
function withAnswer(s: DemoState, org: Id, question: QuestionDef): AssessmentQuestion {
  const task = delegation(s, question.id)
  const delegatedAnswer = task?.status === 'concluida' ? task.answer ?? null : null
  return { ...question, answer: s.answers[org]?.[question.id] ?? delegatedAnswer, delegatedTaskId: task?.id ?? null }
}

export function createAssessmentMock(getActor: () => DemoActor): Pick<AssessmentApi, 'getAssessment' | 'answerQuestion' | 'listQuestions' | 'saveAnswer' | 'delegateQuestion'> {
  const role = (s: DemoState) => s.users.find((u) => u.id === getActor().userId)?.role
  const findQuestion = (id: Id) => {
    const question = QUESTIONS.find((x) => x.id === id)
    if (!question) throw new ApiError('Pergunta não encontrada', 404)
    return question
  }
  const assertOpen = (s: DemoState, org: Id) => {
    if (s.roadmap[org]?.assessmentCompletedAt) throw new ApiError('A avaliação já foi submetida e não pode ser alterada.', 409)
  }

  return {
    getAssessment: (org) => simulate(() => {
      const s = getState()
      if (role(s) === 'analista') throw new ApiError('Não tem permissão para ver a avaliação.', 403)
      const roadmap = s.roadmap[org]
      const done = !!roadmap?.assessmentCompletedAt
      const sections = SECTIONS.map((sec) => {
        const questions = QUESTIONS.filter((x) => x.sectionId === sec.id).map((x) => withAnswer(s, org, x))
        const tasks = questions.map((x) => delegation(s, x.id)).filter((t): t is Task => !!t)
        return {
          ...sec,
          total: questions.length,
          answered: done ? questions.length : questions.filter((x) => x.answer).length,
          delegated: tasks.map((t) => ({ taskId: t.id, assigneeId: t.assigneeId, status: t.status })),
        }
      })
      // Questions waiting for an analyst are skipped: the designated manager continues with the rest.
      const next = done ? undefined : QUESTIONS.find((x) => { const question = withAnswer(s, org, x); return !question.answer && !question.delegatedTaskId })
      return {
        status: roadmap?.validated ? 'validada' : done ? 'submetida' : 'em_curso', sections, maturity: roadmap?.validated ? 2 : null,
        nextQuestion: next ? { sectionId: next.sectionId, questionId: next.id } : null,
        savedAt: s.audit.findLast((e) => e.organizationId === org && e.entityType === 'assessment')?.createdAt ?? null,
      }
    }),

    listQuestions: (org, sectionId) => simulate(() => {
      const s = getState()
      if (role(s) === 'analista') throw new ApiError('Não tem permissão para ver a avaliação.', 403)
      if (!SECTIONS.some((x) => x.id === sectionId)) throw new ApiError('Secção não encontrada', 404)
      return QUESTIONS.filter((x) => x.sectionId === sectionId).map((x) => withAnswer(s, org, x))
    }),

    saveAnswer: (org, questionId, answer) => simulate(() => {
      const s = getState()
      if (role(s) !== 'responsavel') throw new ApiError('Só o Responsável designado responde à avaliação.', 403)
      const question = findQuestion(questionId)
      if (!answer.choice) throw new ApiError('Escolha uma resposta.', 422)
      assertOpen(s, org)
      const saved = { choice: answer.choice, note: answer.note?.trim() || undefined }
      setState((st) => {
        const before = st.answers[org]?.[questionId] ?? null
        const entry = auditEntry({ organizationId: org, userId: getActor().userId, action: before ? 'update' : 'answer', entityType: 'assessment', entityId: questionId, summary: `Respondeu "${CHOICE_LABEL[saved.choice]}" à pergunta "${question.text}"`, before: before && { choice: before.choice }, after: { choice: saved.choice } })
        return { ...st, answers: { ...st.answers, [org]: { ...st.answers[org], [questionId]: saved } }, audit: [...st.audit, entry] }
      })
      return withAnswer(getState(), org, question)
    }),

    delegateQuestion: (org, questionId, input) => simulate(() => {
      const s = getState()
      if (role(s) !== 'responsavel') throw new ApiError('Só o Responsável designado pode delegar perguntas.', 403)
      const question = findQuestion(questionId)
      assertOpen(s, org)
      const member = s.members.find((m) => m.organizationId === org && m.userId === input.assigneeId && m.status === 'ativo' && m.role === 'analista')
      if (!member) throw new ApiError('Escolha um analista ativo da equipa.', 422)
      if (input.dueDate && input.dueDate < s.today) throw new ApiError('O prazo não pode ser no passado.', 422)
      if (delegation(s, questionId)?.status === 'pendente') throw new ApiError('Esta pergunta já foi delegada e está à espera de resposta.', 409)
      const o = s.organizations.find((x) => x.id === org)!
      const me = s.users.find((u) => u.id === getActor().userId)!
      const section = SECTIONS.find((x) => x.id === question.sectionId)!
      const task: Task = {
        id: newId('task'), organizationId: org, kind: 'pergunta', questionId, title: question.text, context: `Avaliação de maturidade · ${section.name}`,
        // US33: the analyst gets the same AI help the designated manager sees.
        aiHelp: `${question.explanation} Exemplo: ${question.example}`,
        assigneeId: member.userId!, assignedBy: me.id, dueDate: input.dueDate, status: 'pendente', createdAt: now(),
      }
      const entry = auditEntry({ organizationId: org, userId: me.id, action: 'assign', entityType: 'task', entityId: task.id, summary: `Delegou a ${member.name} a pergunta "${question.text}"`, before: null, after: { assigneeId: task.assigneeId, dueDate: task.dueDate } })
      setState((st) => notify({ ...st, tasks: [...st.tasks, task], audit: [...st.audit, entry] }, {
        organizationId: org, userId: task.assigneeId, kind: 'tarefa', title: `Nova pergunta técnica de ${me.name}`,
        body: `${question.text}${input.dueDate ? ` · até ${shortDayPt(input.dueDate)}` : ' · sem prazo'}`, link: `/org/${o.slug}/tarefas/${task.id}/pergunta`,
      }))
      return task
    }),

    answerQuestion: (org, taskId, answer) => simulate(() => {
      if (!answer.choice) throw new ApiError('Escolha uma resposta.', 422)
      let saved = getState().tasks.find((t) => t.id === taskId)
      if (!saved || saved.kind !== 'pergunta') throw new ApiError('Pergunta não encontrada', 404)
      if (saved.assigneeId !== getActor().userId) throw new ApiError('Esta pergunta não lhe foi atribuída.', 403)
      setState((s) => {
        const t = s.tasks.find((x) => x.id === taskId)!
        const me = s.users.find((u) => u.id === getActor().userId)!
        saved = { ...t, status: 'concluida', answer: { choice: answer.choice, note: answer.note?.trim() || undefined } }
        const label = CHOICE_LABEL[answer.choice]
        const entry = auditEntry({ organizationId: org, userId: me.id, action: 'answer', entityType: 'task', entityId: taskId, summary: `Respondeu à pergunta técnica: ${label}`, before: { status: t.status }, after: { status: 'concluida', choice: answer.choice } })
        return notify({ ...s, tasks: s.tasks.map((x) => (x.id === taskId ? saved! : x)), audit: [...s.audit, entry] }, {
          organizationId: org, userId: t.assignedBy, kind: 'tarefa_concluida', title: `${me.name.split(' ')[0]} respondeu à pergunta técnica`,
          body: `${label}${answer.note?.trim() ? `: "${answer.note.trim()}"` : ''}`, link: '/org/componentes-agueda/avaliacao',
        })
      })
      return saved!
    }),
  }
}
