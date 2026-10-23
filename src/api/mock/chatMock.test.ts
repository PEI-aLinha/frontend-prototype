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
    await api.chat.save(SCOPE, draft())
  })

  it('a consultora atribuída vê, responde e revê a conversa do cliente', async () => {
    who = MARTA
    const [conversation] = await api.chat.list(SCOPE)
    expect(conversation).toMatchObject({ id: 'chat-rui', userId: RUI })
    await api.chat.save(SCOPE, { ...conversation, messages: [...conversation.messages, { id: 'msg-2', role: 'bot', authorId: MARTA, text: 'Revisto.', createdAt: '2026-10-20T11:00:00' }] })
    expect(await api.chat.review(SCOPE, 'chat-rui')).toMatchObject({ awaitingReview: false, reviewedMessageCount: 2 })
  })

  it('uma consultora não atribuída não lista, não escreve e não revê', async () => {
    unassignMarta()
    who = MARTA
    await expect(api.chat.list(SCOPE)).rejects.toMatchObject({ status: 403 })
    await expect(api.chat.save(SCOPE, draft())).rejects.toMatchObject({ status: 403 })
    await expect(api.chat.review(SCOPE, 'chat-rui')).rejects.toMatchObject({ status: 403 })
    expect(getState().chat.find((c) => c.id === 'chat-rui')).toMatchObject({ awaitingReview: true, messages: [{ id: 'msg-1' }] })
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
