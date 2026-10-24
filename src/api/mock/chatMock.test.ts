import { beforeEach, describe, expect, it } from 'vitest'
import type { ChatConversation } from '../contracts'
import { createMockApi } from './mockApi'
import { getState, resetDemo, setState } from './store'
import { MARTA, ORG_ID, ORG_SLUG, PEDRO, RUI } from './seed'

let who = RUI
const api = createMockApi(() => ({ userId: who }))
const SCOPE = `org:${ORG_SLUG}`

const draft = (): ChatConversation => ({
  id: 'chat-rui',
  scopeKey: SCOPE,
  userId: '',
  messages: [{ id: 'msg-1', role: 'user', text: 'Criar rascunho da política de segurança', createdAt: '2026-10-20T10:00:00' }],
  topic: 'Política de segurança',
  awaitingReview: true,
  createdAt: '2026-10-20T10:00:00',
  updatedAt: '2026-10-20T10:00:00',
})

/** Fluxo real: a pergunta recebe uma resposta do assistente (via send) e a conversa fica à espera da consultora. */
const askForReview = async () => {
  const reply = await api.chat.send(undefined, [{ role: 'user', text: draft().messages[0].text }])
  await api.chat.save(SCOPE, { ...draft(), messages: [...draft().messages, { id: reply.id, role: 'bot', text: reply.text, createdAt: '2026-10-20T10:00:01' }] })
}

/** A organização passa a estar atribuída a outra consultora. */
const unassignMarta = () => setState((s) => ({
  ...s,
  organizations: s.organizations.map((o) => (o.id === ORG_ID ? { ...o, consultantId: 'u-outra' } : o)),
}))

describe('chat: isolamento entre organizações (RNF03)', () => {
  beforeEach(async () => {
    localStorage.clear()
    resetDemo('c1')
    who = RUI
    await askForReview()
  })

  it('a consultora atribuída vê, responde e revê a conversa do cliente', async () => {
    who = MARTA
    const [conversation] = await api.chat.list(SCOPE)
    expect(conversation).toMatchObject({ id: 'chat-rui', userId: RUI })
    await api.chat.save(SCOPE, { ...conversation, messages: [...conversation.messages, { id: 'msg-2', role: 'bot', authorId: MARTA, text: 'Revisto.', createdAt: '2026-10-20T11:00:00' }] })
    expect(await api.chat.review(SCOPE, 'chat-rui')).toMatchObject({ awaitingReview: false, reviewedMessageCount: 3 })
  })

  it('uma consultora não atribuída não lista, não escreve e não revê', async () => {
    unassignMarta()
    who = MARTA
    await expect(api.chat.list(SCOPE)).rejects.toMatchObject({ status: 403 })
    await expect(api.chat.save(SCOPE, draft())).rejects.toMatchObject({ status: 403 })
    await expect(api.chat.review(SCOPE, 'chat-rui')).rejects.toMatchObject({ status: 403 })
    expect(getState().chat.find((c) => c.id === 'chat-rui')).toMatchObject({ awaitingReview: true, messages: [{ id: 'msg-1' }, { role: 'bot' }] })
  })

  it('um membro removido deixa de aceder às conversas da organização', async () => {
    who = PEDRO
    await expect(api.chat.list(SCOPE)).resolves.toEqual([])
    setState((s) => ({ ...s, members: s.members.filter((m) => m.userId !== PEDRO) }))
    await expect(api.chat.list(SCOPE)).rejects.toMatchObject({ status: 403 })
  })

  it('conversas fora de uma organização (ex.: carteira) não são afetadas', async () => {
    who = MARTA
    await expect(api.chat.list('carteira')).resolves.toEqual([])
  })
})

describe('chat: notificação de conversa revista', () => {
  beforeEach(() => {
    localStorage.clear()
    resetDemo('c1')
  })

  const reviewedLink = async (owner: string) => {
    who = owner
    await askForReview()
    who = MARTA
    await api.chat.review(SCOPE, 'chat-rui')
    return getState().notifications.findLast((n) => n.userId === owner && n.kind === 'chat')?.link
  }

  it('leva o responsável ao Início', async () => {
    expect(await reviewedLink(RUI)).toBe(`/org/${ORG_SLUG}/inicio?chat=chat-rui`)
  })

  it('leva o analista às suas tarefas (o Início está bloqueado para ele)', async () => {
    expect(await reviewedLink(PEDRO)).toBe(`/org/${ORG_SLUG}/tarefas?chat=chat-rui`)
  })
})
