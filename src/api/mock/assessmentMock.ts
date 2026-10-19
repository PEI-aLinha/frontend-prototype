import { ApiError, type AssessmentApi, type AssessmentSection, type DemoActor } from '../contracts'
import { notify } from './notify'
import { auditEntry, getState, setState, simulate } from './store'

/** answeredC1 counts Rui's answers; the delegated question adds 1 when the analyst answers. */
/** Maturity assessment sections (summary; the full questionnaire is another plugin). */
const SECTIONS: Array<Omit<AssessmentSection, 'delegated' | 'answered'> & { answeredC1: number; questionTask?: string }> = [
  { id: 'sec-gov', name: 'Governação e responsabilidades', total: 8, answeredC1: 8 },
  { id: 'sec-ativos', name: 'Gestão de ativos', total: 6, answeredC1: 6 },
  { id: 'sec-acessos', name: 'Controlo de acessos', total: 9, answeredC1: 7, questionTask: 'task-pergunta-mfa' },
  { id: 'sec-continuidade', name: 'Continuidade do negócio', total: 7, answeredC1: 6, questionTask: 'task-pergunta-backups' },
  { id: 'sec-incidentes', name: 'Gestão de incidentes', total: 6, answeredC1: 4 },
  { id: 'sec-fornecedores', name: 'Fornecedores e cadeia de abastecimento', total: 5, answeredC1: 2 },
]

/**
 * Level the applicable law expects (RF10). Prototype stand-in: NIS2 raises the bar one level over
 * the base. A real implementation derives it from the questionnaire and the applicable obligations.
 */
function targetMaturity(frameworks: readonly string[]): number {
  return frameworks.some((f) => f.includes('NIS2')) ? 3 : 2
}

export function createAssessmentMock(getActor: () => DemoActor): Pick<AssessmentApi, 'getAssessment' | 'answerQuestion'> {
  return {
    getAssessment: (org) => simulate(() => {
      const s = getState()
      if (s.users.find((u) => u.id === getActor().userId)?.role === 'analista') throw new ApiError('Não tem permissão para ver a avaliação.', 403)
      const roadmap = s.roadmap[org]
      const done = !!roadmap?.assessmentCompletedAt
      const company = s.organizations.find((o) => o.id === org)
      const sections = SECTIONS.map(({ answeredC1, questionTask, ...sec }) => {
        const task = s.tasks.find((t) => t.id === questionTask)
        return {
          ...sec,
          answered: done ? sec.total : Math.min(sec.total, answeredC1 + (task?.status === 'concluida' ? 1 : 0)),
          delegated: task ? [{ taskId: task.id, assigneeId: task.assigneeId, status: task.status }] : [],
        }
      })
      return { status: roadmap?.validated ? 'validada' : done ? 'submetida' : 'em_curso', sections, maturity: roadmap?.validated ? 2 : null, targetMaturity: targetMaturity(company?.frameworks ?? []) }
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
        const label = { sim: 'Sim', parcial: 'Em parte', nao: 'Não', nao_sei: 'Não sei' }[answer.choice]
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
