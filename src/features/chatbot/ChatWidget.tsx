import { useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2, Minus, Sparkles } from 'lucide-react'
import { ChatCompact } from './ChatCompact'
import { ChatExpanded } from './ChatExpanded'
import type { BotReply, BotReplyObject, ChatMessage, Conversation, Suggestion } from './ChatTypes'

export type { BotReply, ChatMessage, Suggestion } from './ChatTypes'

type PersistMode = 'session' | 'local' | false

type ChatWidgetProps = {
  /** Liga ao backend. Sem isto, responde com um texto de exemplo.
   *  `history` não inclui os avisos (role 'notice'). Pode devolver `notice` para mostrar um aviso. */
  onSend?: (text: string, history: ChatMessage[]) => Promise<BotReply>
  /** Opcional: devolve um resumo curto (≤ 40 caracteres) do tema da conversa.
   *  Corre depois da 1.ª resposta e depois de cada 3.ª pergunta. Sem isto, usa a 1.ª pergunta. */
  onSummarize?: (history: ChatMessage[]) => Promise<string>
  suggestions?: Suggestion[]
  title?: string
  subtitle?: string
  defaultOpen?: boolean
  /** Máximo de conversas em paralelo. */
  maxConversations?: number
  /** Onde guardar as conversas entre páginas/recarregamentos. 'session' = só neste separador do browser. */
  persist?: PersistMode
  /** Chave de armazenamento. Inclua o tenant/utilizador, ex.: `alinha-chat:${org.id}`. */
  storageKey?: string
}

/* ------------------------------------------------------------------ */
/* Dados de exemplo e persistência (mock) — substituir pelo backend.   */
/* ------------------------------------------------------------------ */

const DEFAULT_KEY = 'alinha-chat'
const MAX_SAVED_MESSAGES = 200

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
  const s = text.replace(/\s+/g, ' ').replace(/[?!.]+$/, '').trim()
  return s.length > 34 ? `${s.slice(0, 33).trimEnd()}…` : s
}

const freshConversation = (id: number, messageId: number): Conversation => ({
  id,
  messages: [{ id: messageId, role: 'bot', text: GREETING }],
  draft: '',
  typing: false,
  unread: false,
  awaitingReview: false,
})

type Saved = { v: 1; conversations: Conversation[]; activeId: number; open: boolean; expanded: boolean }

const getStorage = (mode: PersistMode): Storage | null => {
  if (!mode) return null
  try {
    return mode === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

function loadSaved(mode: PersistMode, key: string, max: number): Saved | null {
  try {
    const raw = getStorage(mode)?.getItem(key)
    if (!raw) return null
    const data = JSON.parse(raw) as Saved
    if (data?.v !== 1 || !Array.isArray(data.conversations) || data.conversations.length === 0) return null
    const conversations = data.conversations
      .filter((c) => c && typeof c.id === 'number' && Array.isArray(c.messages))
      .slice(0, max)
      .map((c) => ({ ...c, typing: false })) // respostas em curso perdem-se ao recarregar
    if (conversations.length === 0) return null
    const activeId = conversations.some((c) => c.id === data.activeId) ? data.activeId : conversations[0].id
    return { v: 1, conversations, activeId, open: !!data.open, expanded: !!data.expanded }
  } catch {
    return null
  }
}

function writeSaved(mode: PersistMode, key: string, saved: Saved) {
  try {
    const trimmed: Saved = {
      ...saved,
      conversations: saved.conversations.map((c) => ({ ...c, messages: c.messages.slice(-MAX_SAVED_MESSAGES) })),
    }
    getStorage(mode)?.setItem(key, JSON.stringify(trimmed))
  } catch {
    /* quota cheia ou storage bloqueado: ignora */
  }
}

/** Apague as conversas guardadas (ex.: ao terminar sessão). */
export function clearChatHistory(storageKey: string = DEFAULT_KEY) {
  for (const mode of ['session', 'local'] as const) {
    try {
      getStorage(mode)?.removeItem(storageKey)
    } catch {
      /* ignora */
    }
  }
}

/* ------------------------------------------------------------------ */

/**
 * Chatbot flutuante: botão (fechado) <-> painel normal <-> painel expandido (conversas à esquerda).
 * Montar UMA vez num layout que não é desmontado entre páginas (por cima do <Outlet />).
 *
 * Ficheiros: ChatCompact (versão normal), ChatExpanded (versão expandida),
 * ChatThread (mensagens + campo de escrita, partilhado), chatTypes (tipos).
 */
export function ChatWidget({
  onSend,
  onSummarize,
  suggestions = DEFAULT_SUGGESTIONS,
  title = 'Assistente Alinha',
  subtitle = 'NIS2 + RGPD',
  defaultOpen = false,
  maxConversations = 8,
  persist = 'session',
  storageKey = DEFAULT_KEY,
}: ChatWidgetProps) {
  const [boot] = useState<Saved>(() => {
    const saved = loadSaved(persist, storageKey, maxConversations)
    if (saved) return saved
    return { v: 1, conversations: [freshConversation(1, 1)], activeId: 1, open: defaultOpen, expanded: false }
  })
  const nextId = useRef(Math.max(100, ...boot.conversations.flatMap((c) => c.messages.map((m) => m.id))) + 1)
  const nextConvId = useRef(Math.max(...boot.conversations.map((c) => c.id)) + 1)

  const [open, setOpen] = useState(boot.open)
  const [expanded, setExpanded] = useState(boot.expanded)
  const [conversations, setConversations] = useState<Conversation[]>(boot.conversations)
  const [activeId, setActiveId] = useState<number>(boot.activeId)

  // Refs para os callbacks assíncronos verem sempre o estado atual
  const openRef = useRef(open)
  const activeRef = useRef(activeId)
  openRef.current = open
  activeRef.current = activeId

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]
  const hasUnread = conversations.some((c) => c.unread)
  const canAdd = conversations.length < maxConversations

  // Guarda sempre que algo muda
  useEffect(() => {
    writeSaved(persist, storageKey, { v: 1, conversations, activeId, open, expanded })
  }, [persist, storageKey, conversations, activeId, open, expanded])

  // Ao abrir ou trocar de conversa: limpa o "não lida"; Esc minimiza
  useEffect(() => {
    if (!open) return
    setConversations((prev) => prev.map((c) => (c.id === activeId && c.unread ? { ...c, unread: false } : c)))
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, activeId])

  const patch = (id: number, fn: (c: Conversation) => Conversation) =>
    setConversations((prev) => prev.map((c) => (c.id === id ? fn(c) : c)))

  const receive = (id: number, added: ChatMessage[], awaitingReview = false) =>
    patch(id, (c) => ({
      ...c,
      messages: [...c.messages, ...added],
      typing: false,
      unread: activeRef.current !== id || !openRef.current ? true : c.unread,
      awaitingReview: c.awaitingReview || awaitingReview,
    }))

  const send = async (raw: string, from?: Suggestion) => {
    const text = raw.trim()
    if (!text || active.typing) return
    const id = active.id
    const userMsg: ChatMessage = { id: nextId.current++, role: 'user', text }
    const history = [...active.messages, userMsg].filter((m) => m.role !== 'notice')
    patch(id, (c) => ({
      ...c,
      messages: [...c.messages, userMsg],
      draft: '',
      typing: true,
      topic: c.topic ?? from?.topic ?? deriveTopic(text),
    }))
    try {
      const reply = await (onSend ? onSend(text, history) : mockReply(text))
      const body: BotReplyObject = typeof reply === 'string' ? { text: reply } : reply
      const { notice: replyNotice, ...botBody } = body
      const noticeText = replyNotice ?? from?.notice
      const botMsg: ChatMessage = { id: nextId.current++, role: 'bot', ...botBody }
      const added: ChatMessage[] = [botMsg]
      if (noticeText) added.push({ id: nextId.current++, role: 'notice', text: noticeText })
      receive(id, added, !!noticeText)

      // Resumo do tema (opcional, em segundo plano)
      const userCount = history.filter((m) => m.role === 'user').length
      if (onSummarize && (userCount === 1 || userCount % 3 === 0)) {
        onSummarize([...history, botMsg])
          .then((t) => {
            const topic = t.replace(/\s+/g, ' ').trim().slice(0, 40)
            if (topic) patch(id, (c) => ({ ...c, topic }))
          })
          .catch(() => {})
      }
    } catch {
      receive(id, [
        { id: nextId.current++, role: 'bot', error: true, text: 'Não consegui responder agora. Tente novamente daqui a pouco.' },
      ])
    }
  }

  const addConversation = () => {
    if (!canAdd) return
    const c = freshConversation(nextConvId.current++, nextId.current++)
    setConversations((prev) => [...prev, c])
    setActiveId(c.id)
  }

  const closeConversation = (id: number) => {
    if (conversations.length <= 1) return
    const remaining = conversations.filter((c) => c.id !== id)
    setConversations(remaining)
    if (activeId === id) setActiveId(remaining[0].id)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Abrir ${title}`}
        className="group fixed bottom-6 right-6 z-50 inline-flex h-[52px] items-center rounded-full bg-brand px-4 text-white shadow-[0_10px_28px_rgba(2,61,54,0.35)] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand max-sm:bottom-3 max-sm:right-3"
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

  const panelSize = expanded
    ? 'h-[min(924px,calc(100vh-48px))] w-[min(1280px,calc(100vw-48px))]'
    : 'h-[640px] max-h-[calc(100vh-48px)] w-[400px] max-w-[calc(100vw-48px)]'

  const headerBtn =
    'flex size-11 items-center justify-center rounded-[10px] text-white/80 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white'

  const bodyProps = {
    conversations,
    activeId,
    canAdd,
    onSelect: setActiveId,
    onAdd: addConversation,
    onClose: closeConversation,
    conversation: active,
    suggestions,
    onSend: send,
    onDraftChange: (text: string) => patch(active.id, (c) => ({ ...c, draft: text })),
  }

  return (
    <section
      role="dialog"
      aria-label={title}
      className={`fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-[20px] border border-brand-soft bg-white shadow-[0_24px_60px_rgba(2,40,35,0.22)] transition-[width,height] duration-200 max-sm:bottom-3 max-sm:right-3 max-sm:h-[calc(100vh-24px)] max-sm:w-[calc(100vw-24px)] max-sm:max-w-none ${panelSize}`}
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