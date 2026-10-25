import { ApiError, CHAT_ERROR_TEXT, CHAT_GREETING, CHAT_REVIEW_PATTERN, type ChatApi, type ChatConversation, type ChatMessageInput, type ChatReply, type ChatStoredMessage, type DemoActor, type Id } from '../contracts'
import { getState, newId, now, setState, simulate } from './store'
import { notify } from './notify'
import type { DemoState } from './seed'

/** RNF03: as conversas de uma organização só são acessíveis à consultora atribuída e aos membros ativos. */
function requireScopeAccess(state: Readonly<DemoState>, actorId: Id, scopeKey: string) {
  if (!scopeKey.startsWith('org:')) return // ex.: 'carteira', sem organização
  const org = state.organizations.find((o) => o.slug === scopeKey.slice(4))
  if (!org) throw new ApiError('Organização não encontrada', 404)
  const me = state.users.find((u) => u.id === actorId)
  if (me?.role === 'consultor') {
    if (org.consultantId !== me.id) throw new ApiError('Esta organização não está atribuída a si.', 403)
  } else if (!state.members.some((m) => m.organizationId === org.id && m.userId === actorId && m.status === 'ativo')) {
    throw new ApiError('Não tem acesso a esta organização.', 403)
  }
}

type Issued = Map<Id, { userId: Id; reply: Omit<ChatReply, 'id'> }>

/**
 * Mensagens novas do dono da conversa. O que já está guardado não muda (exceto marcar um pedido de documento
 * como respondido), e o servidor decide o conteúdo das mensagens do assistente.
 * `flagged`: há algo novo para a consultora rever.
 */
function ownerMessages(before: ChatConversation | undefined, incoming: ChatStoredMessage[], actorId: Id, issued: Issued) {
  const known = new Map((before?.messages ?? []).map((m) => [m.id, m]))
  const added: ChatStoredMessage[] = []
  let flagged = false
  incoming.forEach((m, index) => {
    if (known.has(m.id)) return
    const base = { id: m.id, createdAt: m.createdAt }
    if (m.role === 'user') {
      added.push({ ...base, role: 'user', authorId: actorId, text: m.text, attachments: m.attachments })
      return
    }
    if (m.role === 'notice') {
      added.push({ ...base, role: 'notice', text: m.text })
      return
    }
    const sent = issued.get(m.id)
    if (sent?.userId === actorId) {
      const { notice, ...reply } = sent.reply
      added.push({ ...base, role: 'bot', ...reply })
      const question = [...(before?.messages ?? []), ...added].findLast((x) => x.role === 'user')
      if (notice || CHAT_REVIEW_PATTERN.test(question?.text ?? '')) flagged = true
    } else if (m.error) {
      added.push({ ...base, role: 'bot', error: true, text: CHAT_ERROR_TEXT })
    } else if (!before && index === 0) {
      added.push({ ...base, role: 'bot', text: CHAT_GREETING })
    } else {
      throw new ApiError('Mensagem do assistente não reconhecida.', 403)
    }
  })
  // Resposta a um pedido de documento: só aponta para um anexo novo do próprio dono
  const fulfilled = new Map(incoming.filter((m) => m.documentRequest?.fulfilledBy).map((m) => [m.id, m.documentRequest!.fulfilledBy!]))
  const kept = (before?.messages ?? []).map((m) => {
    const by = fulfilled.get(m.id)
    if (!m.documentRequest || m.documentRequest.fulfilledBy || !by) return m
    if (!added.some((x) => x.id === by && x.role === 'user' && x.attachments?.length)) return m
    flagged = true
    return { ...m, documentRequest: { ...m.documentRequest, fulfilledBy: by } }
  })
  return { messages: [...kept, ...added], flagged }
}

/** Consultora a rever: só acrescenta mensagens dela, do lado do assistente. */
function reviewerMessages(before: ChatConversation, incoming: ChatStoredMessage[], actorId: Id): ChatStoredMessage[] {
  const known = new Set(before.messages.map((m) => m.id))
  const added = incoming.filter((m) => !known.has(m.id)).map((m): ChatStoredMessage => {
    if (m.role !== 'bot') throw new ApiError('A consultora só pode responder como assistente.', 403)
    return {
      id: m.id,
      role: 'bot',
      authorId: actorId,
      text: m.text,
      attachments: m.attachments,
      documentRequest: m.documentRequest && { title: m.documentRequest.title },
      createdAt: m.createdAt,
    }
  })
  return [...before.messages, ...added]
}

export function createChatMock(getActor: () => DemoActor): ChatApi {
  /** Respostas devolvidas pelo `send`: só estas podem ser guardadas como mensagens do assistente. */
  const issued: Issued = new Map()
  return {
    list: (scopeKey) => simulate(() => {
      const actorId = getActor().userId
      requireScopeAccess(getState(), actorId, scopeKey)
      const isConsultant = getState().users.find((user) => user.id === actorId)?.role === 'consultor'
      return getState().chat
        // Cada utilizador vê as suas próprias conversas; a consultora vê também as de clientes em revisão ou já revistas
        .filter((c) => c.scopeKey === scopeKey && (
          c.userId === actorId ||
          (isConsultant && (c.awaitingReview || c.reviewedMessageCount !== undefined))
        ))
        // Conversa de cliente já revista: a consultora só vê até ao momento da revisão
        .map((c) => isConsultant && c.userId !== actorId && !c.awaitingReview && c.reviewedMessageCount !== undefined
          ? { ...c, messages: c.messages.slice(0, c.reviewedMessageCount) }
          : c)
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    }),

    save: (scopeKey, conversation) => simulate(() => {
      const timestamp = now()
      let result!: ChatConversation
      setState((state) => {
        const actorId = getActor().userId
        requireScopeAccess(state, actorId, scopeKey)
        const me = state.users.find((user) => user.id === actorId)
        const before = state.chat.find((item) => item.id === conversation.id)
        // Não deixa mover uma conversa para outra organização
        if (before && before.scopeKey !== scopeKey) throw new ApiError('Conversa não encontrada.', 404)
        // A consultora "a rever" = conversa existente que pertence a outro utilizador
        const reviewing = me?.role === 'consultor' && !!before && before.userId !== actorId
        if (reviewing && !before!.awaitingReview) throw new ApiError('Conversa não está pendente de revisão.', 409)
        if (before && !reviewing && before.userId !== actorId) throw new ApiError('Não tem permissão para esta ação.', 403)

        // O estado de revisão é decidido aqui: o cliente pode pô-la em revisão (com uma pergunta que o justifique), nunca tirá-la
        const owned = reviewing ? undefined : ownerMessages(before, conversation.messages, actorId, issued)
        result = {
          id: before?.id ?? (conversation.id || newId('chat')),
          scopeKey,
          userId: before?.userId ?? actorId, // o dono não muda quando a consultora guarda
          messages: owned ? owned.messages : reviewerMessages(before!, conversation.messages, actorId),
          topic: reviewing ? before!.topic : conversation.topic?.slice(0, 40),
          topicRenamed: reviewing ? before!.topicRenamed : conversation.topicRenamed,
          awaitingReview: !!before?.awaitingReview || (!!owned?.flagged && me?.role !== 'consultor'),
          reviewedMessageCount: before?.reviewedMessageCount,
          createdAt: before?.createdAt ?? timestamp,
          updatedAt: timestamp,
        }
        const next = {
          ...state,
          chat: before ? state.chat.map((item) => item.id === result.id ? result : item) : [...state.chat, result],
        }
        if (!before?.awaitingReview && result.awaitingReview) {
          const orgSlug = scopeKey.replace(/^org:/, '')
          const org = state.organizations.find((item) => item.slug === orgSlug)
          const consultant = state.users.find((user) => user.id === org?.consultantId)
          // Resposta a um pedido de documento da consultora: a notificação fala do documento
          const last = result.messages.filter((message) => message.role !== 'notice').at(-1)
          const sentDocument = last?.role === 'user' && last.attachments?.length ? `«${last.attachments[0].name}»` : undefined
          return consultant && org
            ? notify(next, sentDocument
              ? { organizationId: org.id, userId: consultant.id, kind: 'chat', title: 'Documento recebido', body: `O cliente enviou ${sentDocument}.`, link: `/clientes/${orgSlug}/visao-geral?chat=${result.id}` }
              : { organizationId: org.id, userId: consultant.id, kind: 'chat', title: 'Resposta do assistente para rever', body: result.topic ? `Reveja a conversa: ${result.topic}.` : 'Há uma resposta do assistente à sua espera.', link: `/clientes/${orgSlug}/visao-geral?chat=${result.id}` })
            : next
        }
        return next
      })
      return result
    }),

    delete: (scopeKey, conversationId) => simulate(() => {
      setState((state) => ({
        ...state,
        chat: state.chat.filter((conversation) => !(conversation.scopeKey === scopeKey && conversation.id === conversationId && conversation.userId === getActor().userId)),
      }))
    }),

    clear: (scopeKey) => simulate(() => {
      setState((state) => ({
        ...state,
        chat: state.chat.filter((conversation) => !(conversation.scopeKey === scopeKey && conversation.userId === getActor().userId)),
      }))
    }),

    review: (scopeKey, conversationId) => simulate(() => {
      const me = getState().users.find((user) => user.id === getActor().userId)
      if (me?.role !== 'consultor') throw new ApiError('Só a consultora pode rever conversas.', 403)
      requireScopeAccess(getState(), me.id, scopeKey)
      let reviewed!: ChatConversation
      setState((state) => {
        const current = state.chat.find((item) => item.id === conversationId && item.scopeKey === scopeKey && item.awaitingReview)
        if (!current) throw new ApiError('Conversa não encontrada ou já revista.', 404)
        const messages = current.messages.filter((message) => message.role !== 'notice')
        reviewed = {
          ...current,
          messages,
          awaitingReview: false,
          reviewedMessageCount: messages.filter((message) => message.role === 'user').length, // ponto até onde a consultora vê
          updatedAt: now(),
        }
        const next = { ...state, chat: state.chat.map((item) => item.id === conversationId ? reviewed : item) }
        const orgSlug = scopeKey.replace(/^org:/, '')
        const org = state.organizations.find((item) => item.slug === orgSlug)
        // O analista não tem acesso ao Início: a sua página é "As minhas tarefas"
        const ownerHome = state.users.find((user) => user.id === current.userId)?.role === 'analista' ? 'tarefas' : 'inicio'
        return org
          ? notify(next, { organizationId: org.id, userId: current.userId, kind: 'chat', title: 'A sua conversa foi revista', body: current.topic ? `A consultora reviu: ${current.topic}.` : 'A consultora respondeu à sua conversa.', link: `/org/${orgSlug}/${ownerHome}?chat=${current.id}` })
          : next
      })
      return reviewed
    }),

    send: (organizationId: Id | undefined, messages: ChatMessageInput[]) =>
      simulate((): ChatReply => {
        const reply = answer(organizationId, messages)
        const id = newId('msg')
        issued.set(id, { userId: getActor().userId, reply })
        return { id, ...reply }
      }),
  }
}

/** Resposta de exemplo do assistente. */
function answer(organizationId: Id | undefined, messages: ChatMessageInput[]): Omit<ChatReply, 'id'> {
  const latest = messages.at(-1)?.text.toLowerCase() ?? ''

  const attached = [...(messages.at(-1)?.text ?? '').matchAll(/\[Anexo: (.+?)\]/g)].map((match) => match[1])
  if (attached.length) {
    return {
      text: `Recebi ${attached.length === 1 ? `o documento «${attached[0]}»` : `${attached.length} documentos`}. Neste protótipo ainda não leio o conteúdo, mas fica guardado na conversa e a consultora pode consultá-lo.`,
    }
  }

  if (latest.includes('responsabilidades')) {
    return {
      text: [
        'Como responsável pela segurança da informação (CISO), as suas responsabilidades principais na NIS2 são:',
        '• Governação: propor e manter a política de segurança e levá-la à aprovação da gestão de topo, que supervisiona as medidas.',
        '• Gestão de risco: identificar ativos e riscos, definir o tratamento e rever periodicamente.',
        '• Medidas técnicas e organizacionais: controlo de acessos, cópias de segurança, cifragem, continuidade de negócio e gestão de vulnerabilidades.',
        '• Cadeia de fornecimento: avaliar a segurança dos fornecedores críticos.',
        '• Incidentes: detetar, responder e coordenar as notificações ao CNCS dentro dos prazos legais.',
        '• Formação: garantir sensibilização e formação para a gestão e os colaboradores.',
        '• Evidências e reporte: reunir provas de conformidade e reportar o estado à gestão e à consultora.',
        '',
        'Informação indicativa: confirme com a consultora.',
      ].join('\n'),
    }
  }

  if (latest.includes('prazos legais')) {
    return {
      text: 'Estes são os prazos legais máximos a cumprir depois de detetar um incidente significativo:',
      table: {
        caption: 'Prazos legais de notificação de um incidente',
        columns: ['Fase da notificação', 'Entidade destinatária', 'Prazo legal máximo'],
        rows: [
          ['Alerta inicial', 'CNCS (MyCiber)', '24 horas após deteção'],
          ['Notificação de dados', 'CNPD (se aplicável)', '72 horas após deteção'],
          ['Atualização do incidente', 'CNCS (MyCiber)', '72 horas após deteção'],
        ],
      },
    }
  }

  if (latest.includes('roadmap')) {
    return {
      text: 'Posso ajudar a analisar o roadmap da organização.',
      notice: organizationId ? 'Resposta associada à organização atual.' : undefined,
    }
  }

  return { text: 'Resposta de exemplo devolvida pela API do assistente.' }
}
