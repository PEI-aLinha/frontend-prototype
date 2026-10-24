import { beforeEach, describe, expect, it } from 'vitest'
import type { RegistrationInput } from '../contracts'
import { createMockApi } from './mockApi'
import { resetDemo } from './store'
import { MARTA, ORG_ID, PEDRO, RUI } from './seed'

let who = RUI
const api = createMockApi(() => ({ userId: who }))
const progress = async () => (await api.assessment.getAssessment(ORG_ID)).sections.map((s) => `${s.answered}/${s.total}`)

describe('assessment questionnaire (mock API)', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemo('c1')
    who = RUI
  })

  it('counts the seeded answers per section', async () => {
    expect(await progress()).toEqual(['8/8', '6/6', '7/9', '7/7', '4/6', '2/5'])
  })

  it('gives every question a kind, an explanation, an example and why it matters', async () => {
    const questions = (await Promise.all((await api.assessment.getAssessment(ORG_ID)).sections.map((s) => api.assessment.listQuestions(ORG_ID, s.id)))).flat()
    expect(questions).toHaveLength(41)
    for (const q of questions) expect([q.explanation, q.example, q.whyItMatters].every((t) => t.trim().length > 0), q.id).toBe(true)
    expect(questions.filter((q) => q.kind === 'tecnica')).toHaveLength(14)
    expect(questions.filter((q) => q.kind === 'gestao')).toHaveLength(27)
  })

  it('points to the next question to answer, skipping the delegated ones', async () => {
    // q-mfa (same section) is waiting for Pedro.
    expect((await api.assessment.getAssessment(ORG_ID)).nextQuestion).toEqual({ sectionId: 'sec-acessos', questionId: 'q-acessos-wifi' })
    await api.assessment.saveAnswer(ORG_ID, 'q-acessos-wifi', { choice: 'sim' })
    expect((await api.assessment.getAssessment(ORG_ID)).nextQuestion).toEqual({ sectionId: 'sec-incidentes', questionId: 'q-inc-antivirus' })
  })

  it('saves the designated manager answer and audits it', async () => {
    const saved = await api.assessment.saveAnswer(ORG_ID, 'q-acessos-wifi', { choice: 'sim', note: '  Rede separada desde 2025.  ' })
    expect(saved.answer).toEqual({ choice: 'sim', note: 'Rede separada desde 2025.' })
    expect(await progress()).toEqual(['8/8', '6/6', '8/9', '7/7', '4/6', '2/5'])
    const history = await api.audit.list(ORG_ID, { entityId: 'q-acessos-wifi' })
    expect(history[0]).toMatchObject({ userId: RUI, action: 'answer', entityType: 'assessment' })
  })

  it('keeps when the progress was last saved', async () => {
    expect((await api.assessment.getAssessment(ORG_ID)).savedAt).toBeNull()
    await api.assessment.saveAnswer(ORG_ID, 'q-acessos-wifi', { choice: 'sim' })
    const [entry] = await api.audit.list(ORG_ID, { entityId: 'q-acessos-wifi' })
    expect((await api.assessment.getAssessment(ORG_ID)).savedAt).toBe(entry.createdAt)
  })

  it('denies the questionnaire to the analyst', async () => {
    who = PEDRO
    await expect(api.assessment.listQuestions(ORG_ID, 'sec-acessos')).rejects.toMatchObject({ status: 403 })
    await expect(api.assessment.saveAnswer(ORG_ID, 'q-acessos-wifi', { choice: 'sim' })).rejects.toMatchObject({ status: 403 })
  })

  it("denies another organization's questionnaire, even to a designated manager", async () => {
    await expect(api.assessment.saveAnswer('org-outra', 'q-acessos-wifi', { choice: 'sim' })).rejects.toMatchObject({ status: 403 })
    await expect(api.assessment.listQuestions('org-outra', 'sec-acessos')).rejects.toMatchObject({ status: 403 })
    await expect(api.assessment.submitAssessment('org-outra')).rejects.toMatchObject({ status: 403 })
    who = MARTA
    await expect(api.assessment.getAssessment('org-outra')).rejects.toMatchObject({ status: 403 })
  })

  it('delegates a question once and rejects a past deadline', async () => {
    await expect(api.assessment.delegateQuestion(ORG_ID, 'q-inc-antivirus', { assigneeId: PEDRO, dueDate: '2020-01-01' })).rejects.toMatchObject({ status: 422 })
    const task = await api.assessment.delegateQuestion(ORG_ID, 'q-inc-antivirus', { assigneeId: PEDRO, dueDate: null })
    expect(task).toMatchObject({ kind: 'pergunta', questionId: 'q-inc-antivirus', assigneeId: PEDRO, status: 'pendente', context: 'Avaliação de maturidade · Gestão de incidentes' })
    expect(task.aiHelp).toMatch(/^Cada computador e servidor tem um antivírus.+ Exemplo: O Microsoft Defender/)
    await expect(api.assessment.delegateQuestion(ORG_ID, 'q-inc-antivirus', { assigneeId: PEDRO, dueDate: null })).rejects.toMatchObject({ status: 409 })

    who = PEDRO
    expect((await api.assets.listTasks(ORG_ID)).map((t) => t.id)).toContain(task.id)
    expect((await api.notifications.list())[0]).toMatchObject({ kind: 'tarefa', link: `/org/componentes-agueda/tarefas/${task.id}/pergunta` })
  })

  it("shows the analyst's answer on the delegated question", async () => {
    const task = await api.assessment.delegateQuestion(ORG_ID, 'q-inc-antivirus', { assigneeId: PEDRO, dueDate: null })
    who = PEDRO
    await api.assessment.answerQuestion(ORG_ID, task.id, { choice: 'parcial', note: 'Falta nos portáteis.' })
    who = RUI
    const question = (await api.assessment.listQuestions(ORG_ID, 'sec-incidentes')).find((q) => q.id === 'q-inc-antivirus')
    expect(question).toMatchObject({ answer: { choice: 'parcial', note: 'Falta nos portáteis.' }, delegatedTaskId: task.id })
    expect(await progress()).toEqual(['8/8', '6/6', '7/9', '7/7', '5/6', '2/5'])
  })

  it('submits only when every question is answered, then notifies the consultant', async () => {
    await expect(api.assessment.submitAssessment(ORG_ID)).rejects.toMatchObject({ status: 422, message: 'Faltam 7 perguntas por responder.' })
    who = PEDRO
    await expect(api.assessment.submitAssessment(ORG_ID)).rejects.toMatchObject({ status: 403 })

    who = RUI
    const { sections } = await api.assessment.getAssessment(ORG_ID)
    const questions = (await Promise.all(sections.map((s) => api.assessment.listQuestions(ORG_ID, s.id)))).flat()
    await Promise.all(questions.filter((x) => !x.answer).map((q) => api.assessment.saveAnswer(ORG_ID, q.id, { choice: 'sim' })))
    await api.assessment.submitAssessment(ORG_ID)

    expect((await api.assessment.getAssessment(ORG_ID)).status).toBe('submetida')
    await expect(api.assessment.saveAnswer(ORG_ID, 'q-gov-politica', { choice: 'nao' })).rejects.toMatchObject({ status: 409 })
    await expect(api.assessment.submitAssessment(ORG_ID)).rejects.toMatchObject({ status: 409 })
    expect((await api.audit.list(ORG_ID, { entityType: 'assessment' }))[0]).toMatchObject({ userId: RUI, action: 'submit', summary: 'Submeteu a avaliação' })

    who = MARTA
    expect((await api.notifications.list())[0]).toMatchObject({ kind: 'avaliacao', title: 'Avaliação concluída', link: '/clientes/componentes-agueda/visao-geral' })
    expect((await api.assessment.listPortfolio()).find((p) => p.organization.id === ORG_ID)).toMatchObject({ stage: 'Avaliação concluída', nextStep: 'Registar riscos e validar roadmap' })
  }, 15_000) // About 15 mock calls, each with simulated latency.

  it('locks the questionnaire after submission', async () => {
    resetDemo('c3')
    expect(await progress()).toEqual(['8/8', '6/6', '9/9', '7/7', '6/6', '5/5'])
    expect((await api.assessment.getAssessment(ORG_ID)).nextQuestion).toBeNull()
    await expect(api.assessment.saveAnswer(ORG_ID, 'q-gov-politica', { choice: 'nao' })).rejects.toMatchObject({ status: 409 })
    await expect(api.assessment.delegateQuestion(ORG_ID, 'q-gov-politica', { assigneeId: PEDRO, dueDate: null })).rejects.toMatchObject({ status: 409 })
  })
})

const input: RegistrationInput = {
  account: { name: 'Rui Santos', email: 'rui.santos@compagueda.pt' },
  organization: {
    name: 'Componentes Águeda, Lda.', nif: '509180027', cae: '29320', sector: 'industria', subsector: 'automoveis',
    services: 'Fabrico de componentes para a indústria automóvel', employees: 120, turnover: 18_500_000,
    address: { street: 'Rua da Zona Industrial do Casarão, 45', postalCode: '3750-750', city: 'Águeda' },
    contacts: { phone: '234600120', email: 'geral@compagueda.pt' },
    permanentContact: { name: 'Rui Santos', phone: '912345678' },
  },
}

describe('assessment summary (RF10)', () => {
  beforeEach(() => {
    localStorage.clear()
    who = RUI
  })

  it('knows the target level before the current one exists', async () => {
    resetDemo('c1')
    const summary = await api.assessment.getAssessment(ORG_ID)
    expect(summary.maturity).toBeNull()
    expect(summary.targetMaturity).toBe(3)
  })

  it('shows the calculated level to the consultant once the assessment is complete', async () => {
    resetDemo('c2')
    who = MARTA
    const summary = await api.assessment.getAssessment(ORG_ID)
    expect(summary.status).toBe('submetida')
    expect(summary.maturity).toBe(2)
  })

  it('keeps the calculated level hidden from the client until validation', async () => {
    resetDemo('c2')
    expect((await api.assessment.getAssessment(ORG_ID)).maturity).toBeNull()
  })

  it('does not invent a level while the assessment is in course', async () => {
    resetDemo('c1')
    who = MARTA
    expect((await api.assessment.getAssessment(ORG_ID)).maturity).toBeNull()
  })

  it('reports both levels once the consultant validates', async () => {
    resetDemo('c3')
    const summary = await api.assessment.getAssessment(ORG_ID)
    expect(summary.status).toBe('validada')
    expect(summary.maturity).toBe(2)
    expect(summary.targetMaturity).toBe(3)
  })

  it('lowers the target when NIS2 is not among the frameworks', async () => {
    resetDemo('c0')
    const org = await api.organization.register(input)
    expect((await api.assessment.getAssessment(org.id)).targetMaturity).toBe(2)
  })

  it('denies the analyst', async () => {
    resetDemo('c3')
    who = PEDRO
    await expect(api.assessment.getAssessment(ORG_ID)).rejects.toMatchObject({ status: 403 })
    who = MARTA
    await expect(api.assessment.getAssessment(ORG_ID)).resolves.toMatchObject({ targetMaturity: 3 })
  })
})
