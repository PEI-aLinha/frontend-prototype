import { beforeEach, describe, expect, it } from 'vitest'
import { createMockApi } from './mockApi'
import { resetDemo } from './store'
import { ORG_ID, PEDRO, RUI } from './seed'

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

  it('locks the questionnaire after submission', async () => {
    resetDemo('c3')
    expect(await progress()).toEqual(['8/8', '6/6', '9/9', '7/7', '6/6', '5/5'])
    expect((await api.assessment.getAssessment(ORG_ID)).nextQuestion).toBeNull()
    await expect(api.assessment.saveAnswer(ORG_ID, 'q-gov-politica', { choice: 'nao' })).rejects.toMatchObject({ status: 409 })
    await expect(api.assessment.delegateQuestion(ORG_ID, 'q-gov-politica', { assigneeId: PEDRO, dueDate: null })).rejects.toMatchObject({ status: 409 })
  })
})
