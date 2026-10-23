import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2, Minus, Sparkles } from 'lucide-react'
import { ChatCompact } from './ChatCompact'
import { ChatExpanded } from './ChatExpanded'
import { newChatId } from './ChatTypes'
import { OPEN_CHAT_EVENT, type OpenChatOptions } from './ChatControl'
import type { BotReply, BotReplyObject, ChatMessage, Conversation, Suggestion } from './ChatTypes'
import type { SendOptions } from './ChatThread'
import { keepAttachment } from './attachmentStore'
import { Button, ErrorState, SkeletonRows, useToast } from '../../ui'

export type { BotReply, ChatMessage, Suggestion } from './ChatTypes'

type ChatWidgetProps = {
  /** Liga ao backend. Sem isto, responde com um texto de exemplo.
   *  `history` não inclui os avisos (role 'notice'). Pode devolver `notice` para mostrar um aviso. */
  onSend?: (text: string, history: ChatMessage[]) => Promise<BotReply | null>
  /** Opcional: devolve um resumo curto (≤ 40 caracteres) do tema da conversa. */
  onSummarize?: (history: ChatMessage[]) => Promise<string>
  suggestions?: Suggestion[]
  title?: string
  subtitle?: string
  defaultOpen?: boolean
  /** Máximo de conversas em paralelo. */
  maxConversations?: number
  /** Conversas do servidor. Quando mudam, são sincronizadas (sem tocar nas que têm alterações por guardar). */
  initialConversations?: Conversation[]
  loading?: boolean
  error?: unknown
  onRetry?: () => void
  onSaveConversation?: (conversation: Conversation) => Promise<void> | void
  onDeleteConversation?: (conversationId: string) => Promise<void> | void
  reviewOnReply?: (text: string) => boolean
  /** O utilizador pode rever conversas de outros (consultora). */
  canReview?: boolean
  onReview?: (conversationId: string) => Promise<void> | void
  /** Id do utilizador atual. Necessário para distinguir conversas próprias de conversas de clientes. */
  senderId?: string
  initialConversationId?: string
}

const GREETING =
  'Olá! Sou o assistente da Alinha. Posso ajudar a perceber os riscos, o roadmap e os requisitos da NIS2 e do RGPD.'

const ROADMAP_NOTICE = 'A aguardar que um consultor verifique e aprove o roadmap.'

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { label: 'Cria-me um roadmap total para entrar em conformidade', topic: 'Roadmap de conformidade', notice: ROADMAP_NOTICE },
  { label: 'Explicar os riscos altos', topic: 'Riscos altos' },
  { label: 'O que é a NIS2?', topic: 'O que é a NIS2' },
]

const mockReply = (text: string): Promise<BotReply> =>
  new Promise((resolve) =>
    setTimeout(
      () =>
        resolve(
          text.toLowerCase().includes('roadmap total')
            ? 'Comecei a preparar o roadmap completo para a conformidade com a NIS2 e o RGPD.'
            : 'Resposta de exemplo. Aqui vai aparecer a resposta devolvida pelo modelo.',
        ),
      1000,
    ),
  )

const deriveTopic = (text: string) => {
  let s = text.replace(/\s+/g, ' ').trim()
  while (s.length > 0 && '?!.'.includes(s[s.length - 1])) {
    s = s.slice(0, -1)
  }
  return s.length > 34 ? `${s.slice(0, 33).trimEnd()}…` : s
}

const freshConversation = (): Conversation => ({
  id: newChatId('chat'),
  messages: [{ id: newChatId('msg'), role: 'bot', text: GREETING, createdAt: new Date().toISOString() }],
  draft: '',
  typing: false,
  unread: false,
  awaitingReview: false,
})

/**
 * Conversa de outro utilizador que a consultora está a rever.
 * Conversas próprias (ou ainda sem dono, ou seja, novas) nunca são "a rever".
 */
const isReviewing = (c: Conversation, canReview: boolean, me?: string) =>
  canReview && !!c.ownerId && c.ownerId !== me

/** Junta por id, sem nunca perder mensagens (uma resposta do servidor pode estar desatualizada). */
const mergeMessages = (local: ChatMessage[], server: ChatMessage[]): ChatMessage[] => {
  const byId = new Map<string, ChatMessage>()
  for (const m of [...local, ...server]) byId.set(m.id, m)
  return [...byId.values()].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
}

/**
 * Chatbot flutuante: botão (fechado) <-> painel normal <-> painel expandido (conversas à esquerda).
 * Montar UMA vez num layout que não é desmontado entre páginas (por cima do <Outlet />).
 */
export function ChatWidget({
  onSend,
  onSummarize,
  suggestions = DEFAULT_SUGGESTIONS,
  title = 'Assistente Alinha',
  subtitle = 'NIS2 + RGPD',
  defaultOpen = false,
  maxConversations = 8,
  initialConversations,
  loading = false,
  error,
  onRetry,
  onSaveConversation,
  onDeleteConversation,
  reviewOnReply,
  canReview = false,
  onReview,
  senderId,
  initialConversationId,
}: ChatWidgetProps) {
  const toast = useToast()
  const [boot] = useState(() => {
    const list = initialConversations?.length ? initialConversations : [freshConversation()]
    return { conversations: list, activeId: initialConversationId ?? list[0].id, open: defaultOpen, expanded: false }
  })
  const hydrated = useRef(initialConversations !== undefined)
  const [ready, setReady] = useState(initialConversations !== undefined)

  const [open, setOpen] = useState(boot.open)
  const [expanded, setExpanded] = useState(boot.expanded)
  const [conversations, setConversations] = useState<Conversation[]>(boot.conversations)
  const [activeId, setActiveId] = useState<string>(boot.activeId)

  // Refs para os callbacks assíncronos verem sempre o estado atual
  const openRef = useRef(open)
  const activeRef = useRef(activeId)
  /** Conversas alteradas localmente e ainda por guardar. Só estas são enviadas ao servidor. */
  const dirty = useRef<Set<string>>(new Set())
  /** Conversas fechadas localmente: a sincronização não as pode ressuscitar. */
  const closed = useRef<Set<string>>(new Set())
  /** Saves ainda em curso por conversa: até terminarem, a versão do servidor pode estar desatualizada. */
  const saving = useRef<Map<string, number>>(new Map())
  /** Fila de saves: chegam ao servidor pela ordem em que foram pedidos. */
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    openRef.current = open
    activeRef.current = activeId
  }, [activeId, open])

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]
  const hasUnread = conversations.some((c) => c.unread)
  const canAdd = conversations.length < maxConversations

  // Hidratação inicial + sincronização com o servidor (ex.: a consultora respondeu)
  useEffect(() => {
    if (initialConversations === undefined) return
    if (!hydrated.current) {
      const next = initialConversations.length ? initialConversations : [freshConversation()]
       
      setConversations(next)
      setActiveId(next.find((c) => c.id === initialConversationId)?.id ?? next[0].id)
      hydrated.current = true
      setReady(true)
      return
    }
    setConversations((prev) => {
      let changed = false
      const next = [...prev]
      for (const server of initialConversations) {
        if (closed.current.has(server.id)) continue
        const i = next.findIndex((c) => c.id === server.id)
        if (i === -1) {
          next.push(server)
          changed = true
          continue
        }
        const local = next[i]
        if (local.serverUpdatedAt === server.serverUpdatedAt) continue
        // versão do servidor mais antiga do que a que já temos: ignorar
        if (local.serverUpdatedAt && server.serverUpdatedAt && server.serverUpdatedAt < local.serverUpdatedAt) continue
        if (dirty.current.has(local.id) || saving.current.has(local.id) || local.typing) continue // não pisar alterações locais
        const viewing = openRef.current && activeRef.current === local.id
        const merged = mergeMessages(local.messages, server.messages)
          // o aviso "Em revisão" só vale enquanto a conversa estiver à espera de revisão
          .filter((m) => server.awaitingReview || m.role !== 'notice')
        const hasNew = local.messages.at(-1)?.id !== merged.at(-1)?.id || local.messages.length !== merged.length
        next[i] = {
          ...local,
          messages: merged,
          awaitingReview: server.awaitingReview,
          topic: server.topic ?? local.topic,
          topicRenamed: server.topicRenamed ?? local.topicRenamed,
          createdAt: server.createdAt ?? local.createdAt,
          serverUpdatedAt: server.serverUpdatedAt,
          ownerId: server.ownerId ?? local.ownerId,
          unread: local.unread || (hasNew && !viewing),
        }
        changed = true
      }
      return changed ? next : prev
    })
  }, [initialConversationId, initialConversations])

  // Guarda apenas o que foi alterado localmente (não a hidratação, nem cada tecla do rascunho).
  // Conversas de clientes só são guardadas enquanto estão à espera de revisão; as próprias são sempre guardadas.
  useEffect(() => {
    if (!onSaveConversation || !ready || loading) return
    const ids = [...dirty.current]
    if (ids.length === 0) return
    dirty.current.clear()
    conversations
      .filter((c) => ids.includes(c.id) && (!isReviewing(c, canReview, senderId) || c.awaitingReview))
      .forEach((c) => {
        saving.current.set(c.id, (saving.current.get(c.id) ?? 0) + 1)
        saveQueue.current = saveQueue.current
          .then(() => onSaveConversation(c))
          .catch(() => toast.show('Não foi possível guardar a conversa.', 'error'))
          .finally(() => {
            const left = (saving.current.get(c.id) ?? 1) - 1
            if (left > 0) saving.current.set(c.id, left)
            else saving.current.delete(c.id)
          })
      })
  }, [canReview, conversations, loading, onSaveConversation, ready, senderId, toast])

  // Ao abrir ou trocar de conversa: limpa o "não lida"; Esc minimiza
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConversations((prev) => prev.map((c) => (c.id === activeId && c.unread ? { ...c, unread: false } : c)))
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, activeId])

  // Abrir a partir de fora (ex.: botão na barra lateral), opcionalmente já em ecrã inteiro
  useEffect(() => {
    const onOpen = (e: Event) => {
      const wanted = (e as CustomEvent<OpenChatOptions>).detail?.expanded
      setOpen(true)
      if (wanted !== undefined) setExpanded(wanted)
    }
    window.addEventListener(OPEN_CHAT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen)
  }, [])

  // Rede de segurança: nunca ficar sem conversas
  useEffect(() => {
    if (conversations.length === 0) {
      const c = freshConversation()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConversations([c])
      setActiveId(c.id)
    }
  }, [conversations.length])

  /** Alteração local que deve ser guardada no servidor. */
  const patch = (id: string, fn: (c: Conversation) => Conversation) => {
    dirty.current.add(id)
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)))
  }

  /** Alteração só de interface (rascunho, etc.): não guarda. */
  const patchLocal = (id: string, fn: (c: Conversation) => Conversation) =>
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)))

  const receive = (id: string, added: ChatMessage[], awaitingReview = false) =>
    patch(id, (c) => ({
      ...c,
      messages: [...c.messages, ...added],
      typing: false,
      unread: activeRef.current !== id || !openRef.current ? true : c.unread,
      awaitingReview: c.awaitingReview || awaitingReview,
    }))

  const send = async (raw: string, from?: Suggestion, { files = [], answers }: SendOptions = {}) => {
    const text = raw.trim()
    if ((!text && files.length === 0) || !active || active.typing) return
    const id = active.id
    const reviewing = isReviewing(active, canReview, senderId)
    const attachments = files.length ? files.map(keepAttachment) : undefined

    // Consultora a responder a um cliente: a mensagem é dela (lado do assistente) e a IA não é chamada.
    if (reviewing) {
      const consultantMsg: ChatMessage = {
        id: newChatId('msg'),
        role: 'bot',
        authorId: senderId,
        text,
        attachments,
        createdAt: new Date().toISOString(),
      }
      patch(id, (c) => ({ ...c, messages: [...c.messages, consultantMsg], draft: '', topic: c.topic ?? deriveTopic(text || files[0].name) }))
      return
    }

    // Resposta a um pedido de documento da consultora: vai para ela (fica à espera de revisão) e a IA não é chamada.
    if (answers && attachments) {
      const stamp = new Date().toISOString()
      const userMsg: ChatMessage = { id: newChatId('msg'), role: 'user', authorId: senderId, text, attachments, createdAt: stamp }
      const notice: ChatMessage = { id: newChatId('msg'), role: 'notice', text: 'Documento enviado à consultora. Ela vai analisá-lo e responder aqui.', createdAt: stamp }
      patch(id, (c) => ({
        ...c,
        messages: [
          ...c.messages.map((m) => m.id === answers && m.documentRequest ? { ...m, documentRequest: { ...m.documentRequest, fulfilledBy: userMsg.id } } : m),
          userMsg,
          notice,
        ],
        awaitingReview: true,
      }))
      return
    }

    // Conversa própria (cliente ou consultora): és o "user" e a IA responde.
    const userMsg: ChatMessage = { id: newChatId('msg'), role: 'user', authorId: senderId, text, attachments, createdAt: new Date().toISOString() }
    const history = [...active.messages, userMsg].filter((m) => m.role !== 'notice')
    patch(id, (c) => ({
      ...c,
      messages: [...c.messages, userMsg],
      draft: '',
      typing: true,
      topic: c.topic ?? from?.topic ?? deriveTopic(text || files[0].name),
    }))
    try {
      const reply = await (onSend ? onSend(text, history) : mockReply(text))
      if (reply === null) {
        receive(id, [])
        return
      }
      const body: BotReplyObject = typeof reply === 'string' ? { text: reply } : reply
      const { notice: replyNotice, ...botBody } = body
      // A consultora não precisa de revisão: as suas conversas nunca ficam "à espera".
      const noticeText = canReview ? undefined : (replyNotice ?? from?.notice)
      const stamp = new Date().toISOString()
      const botMsg: ChatMessage = { id: newChatId('msg'), role: 'bot', createdAt: stamp, ...botBody }
      const added: ChatMessage[] = [botMsg]
      if (noticeText) added.push({ id: newChatId('msg'), role: 'notice', text: noticeText, createdAt: stamp })
      receive(id, added, !canReview && (!!reviewOnReply?.(text) || !!noticeText))

      // Resumo do tema (opcional, em segundo plano)
      const userCount = history.filter((m) => m.role === 'user').length
      if (onSummarize && !active.topicRenamed && (userCount === 1 || userCount % 3 === 0)) {
        onSummarize([...history, botMsg])
          .then((t) => {
            const topic = t.replace(/\s+/g, ' ').trim().slice(0, 40)
            if (topic) patch(id, (c) => (c.topicRenamed ? c : { ...c, topic }))
          })
          .catch(() => {})
      }
    } catch {
      toast.show('Não foi possível responder agora. Tente novamente.', 'error')
      receive(id, [
        { id: newChatId('msg'), role: 'bot', error: true, text: 'Não consegui responder agora. Tente novamente daqui a pouco.', createdAt: new Date().toISOString() },
      ])
    }
  }

  /** Consultora a rever: pede ao cliente um documento. O pedido é uma mensagem dela com um cartão para o cliente responder. */
  const requestDocument = (title: string, note: string) => {
    const name = title.trim()
    if (!active || !name) return
    const request: ChatMessage = {
      id: newChatId('msg'),
      role: 'bot',
      authorId: senderId,
      text: [`Pode enviar-me o documento «${name}»?`, note.trim()].filter(Boolean).join('\n'),
      documentRequest: { title: name },
      createdAt: new Date().toISOString(),
    }
    patch(active.id, (c) => ({ ...c, messages: [...c.messages, request] }))
  }

  /** Muda o nome da conversa. Vazio volta ao nome automático (derivado da 1.ª pergunta). */
  const renameConversation = (id: string, name: string) => {
    const topic = name.replace(/\s+/g, ' ').trim().slice(0, 40)
    patch(id, (c) => {
      const firstQuestion = c.messages.find((m) => m.role === 'user')
      return topic
        ? { ...c, topic, topicRenamed: true }
        : { ...c, topic: firstQuestion ? deriveTopic(firstQuestion.text || firstQuestion.attachments?.[0]?.name || '') || undefined : undefined, topicRenamed: false }
    })
  }

  const addConversation = () => {
    if (!canAdd) return
    const c = freshConversation()
    setConversations((prev) => [...prev, c])
    setActiveId(c.id)
  }

  const closeConversation = (id: string) => {
    if (conversations.length <= 1) return
    const remaining = conversations.filter((c) => c.id !== id)
    dirty.current.delete(id)
    closed.current.add(id)
    setConversations(remaining)
    if (activeId === id) setActiveId(remaining[0].id)
    Promise.resolve(onDeleteConversation?.(id)).catch(() => toast.show('Não foi possível apagar a conversa.', 'error'))
  }

  // Todos os hooks já correram: seguro devolver cedo
  if (!active) return null

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Abrir ${title}`}
        className="group fixed bottom-6 right-6 z-50 inline-flex h-[52px] items-center rounded-full bg-brand px-4 text-white shadow-[0_10px_28px_rgba(2,61,54,0.35)] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand max-sm:bottom-[calc(132px+env(safe-area-inset-bottom))] max-sm:right-3"
      >
        <Sparkles className="size-5 flex-none" aria-hidden />
        <span
          aria-hidden
          className="ml-0 max-w-0 overflow-hidden whitespace-nowrap text-[14px] font-bold opacity-0 transition-all duration-200 group-hover:ml-2.5 group-hover:max-w-[200px] group-hover:opacity-100 group-focus-visible:ml-2.5 group-focus-visible:max-w-[200px] group-focus-visible:opacity-100"
        >
          Pergunta à Alinha
        </span>
        {hasUnread && (
          <span className="absolute -right-0.5 -top-0.5 size-3.5 rounded-full border-2 border-white bg-red-500">
            <span className="sr-only">Novas mensagens</span>
          </span>
        )}
      </button>
    )
  }

  const panelBox = expanded
    ? 'fixed inset-0 z-[90] h-dvh w-dvw'
    : 'fixed bottom-6 right-6 z-[90] h-[640px] max-h-[calc(100vh-48px)] w-[400px] max-w-[calc(100vw-48px)] rounded-[20px] border border-brand-soft shadow-[0_24px_60px_rgba(2,40,35,0.22)] max-sm:bottom-3 max-sm:right-3 max-sm:h-[calc(100vh-24px)] max-sm:w-[calc(100vw-24px)] max-sm:max-w-none'

  const headerBtn =
    'flex size-11 items-center justify-center rounded-[10px] text-white/80 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white'

  const reviewing = isReviewing(active, canReview, senderId)

  const bodyProps = {
    conversations,
    activeId: active.id,
    canAdd,
    onSelect: setActiveId,
    onAdd: addConversation,
    onClose: closeConversation,
    onRename: renameConversation,
    // Conversas de clientes (consultora a rever) mantêm o nome que o cliente lhes deu
    canRename: (c: Conversation) => !isReviewing(c, canReview, senderId),
    conversation: active,
    suggestions,
    onSend: send,
    onRequestDocument: reviewing ? requestDocument : undefined,
    onDraftChange: (text: string) => patchLocal(active.id, (c) => ({ ...c, draft: text })),
    canReview,
    reviewing,
    onReview: onReview && reviewing ? async () => {
      const id = active.id
      try {
        // garante que a última mensagem da consultora está no servidor antes de rever
        await saveQueue.current
        await onSaveConversation?.(active)
        dirty.current.delete(id)
        await onReview(id)
        patchLocal(id, (c) => ({ ...c, awaitingReview: false, messages: c.messages.filter((m) => m.role !== 'notice') }))
      } catch {
        toast.show('Não foi possível marcar como revisto.', 'error')
      }
    } : undefined,
  }

  if (loading || error) {
    return (
      <section role="dialog" aria-label={title} aria-modal="false" className={`flex flex-col overflow-hidden bg-white ${panelBox}`}>
        <header className="flex items-center gap-3 bg-brand py-4 pl-[18px] pr-3 text-white">
          <Sparkles className="size-[18px]" aria-hidden />
          <strong className="flex-1 text-[15px] font-extrabold">{title}</strong>
          <Button variant="inverse" size="sm" onClick={() => setOpen(false)}>Fechar</Button>
        </header>
        <div className="flex flex-1 items-center justify-center p-6">
          {loading ? <SkeletonRows rows={3} /> : <ErrorState error={error} onRetry={onRetry} />}
        </div>
      </section>
    )
  }

  return (
    <section
      role="dialog"
      aria-label={title}
      className={`flex flex-col overflow-hidden bg-white ${panelBox}`}
    >
      <header className="flex items-center gap-3 bg-brand py-4 pl-[18px] pr-3 text-white">
        <span className="flex size-9 flex-none items-center justify-center rounded-full bg-white/20" aria-hidden>
          <Sparkles className="size-[18px]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <strong className="text-[15px] font-extrabold">{title}</strong>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/70">{subtitle}</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Reduzir assistente' : 'Expandir assistente'}
          aria-pressed={expanded}
          className={`${headerBtn} max-md:hidden`}
        >
          {expanded ? <Minimize2 className="size-[18px]" aria-hidden /> : <Maximize2 className="size-[18px]" aria-hidden />}
        </button>
        <button type="button" onClick={() => setOpen(false)} aria-label="Minimizar assistente" className={headerBtn}>
          <Minus className="size-[18px]" aria-hidden />
        </button>
      </header>

      {expanded ? (
        <ChatExpanded {...bodyProps} maxConversations={maxConversations} />
      ) : (
        <ChatCompact {...bodyProps} />
      )}
    </section>
  )
}