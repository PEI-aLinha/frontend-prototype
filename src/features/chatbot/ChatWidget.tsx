import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Clock, Minus, Plus, Send, Sparkles, X } from 'lucide-react'

type ChatSource = { label: string; title: string; to: string; cta?: string }
type ChatMessage = {
  id: number
  role: 'user' | 'bot' | 'notice'
  text: string
  source?: ChatSource
  error?: boolean
}
type BotReplyObject = { text: string; source?: ChatSource; notice?: string }
type BotReply = string | BotReplyObject

type Suggestion = {
  label: string
  /** Resumo curto mostrado no separador da conversa. Se omitido, deriva-se da 1.ª pergunta. */
  topic?: string
  /** Se definido, aparece um aviso na conversa depois da resposta do bot. */
  notice?: string
}

type Conversation = {
  id: number
  messages: ChatMessage[]
  draft: string
  typing: boolean
  unread: boolean
  awaitingReview: boolean
  /** Resumo do tema, mostrado no separador. */
  topic?: string
}

type PersistMode = 'session' | 'local' | false

type ChatWidgetProps = {
  /** Liga ao backend. Sem isto, responde com um texto de exemplo.
   *  `history` não inclui os avisos (role 'notice'). Pode devolver `notice` para mostrar um aviso. */
  onSend?: (text: string, history: ChatMessage[]) => Promise<BotReply>
  /** Opcional: devolve um resumo curto (≤ 40 caracteres) do tema da conversa.
   *  Corre depois da 1.ª resposta e depois de cada 3.ª pergunta. Sem isto, usa a 1.ª pergunta. */
  onSummarize?: (history: ChatMessage[]) => Promise<string>
  /** Páginas onde o botão fechado aparece sempre comprido, com texto.
   *  Nas restantes mostra só o ícone (o texto aparece ao passar o rato).
   *  String = pathname contém o valor (ex.: '/tarefas'); RegExp = teste ao pathname. */
  expandedPaths?: Array<string | RegExp>
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

/* ---------- Persistência ---------- */

type Saved = { v: 1; conversations: Conversation[]; activeId: number; open: boolean }

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
    return { v: 1, conversations, activeId, open: !!data.open }
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

const freshConversation = (id: number, messageId: number): Conversation => ({
  id,
  messages: [{ id: messageId, role: 'bot', text: GREETING }],
  draft: '',
  typing: false,
  unread: false,
  awaitingReview: false,
})

/**
 * Chatbot flutuante: botão (fechado) <-> painel (aberto), com várias conversas em paralelo.
 * Montar UMA vez num layout que não é desmontado entre páginas (por cima do <Outlet />).
 */
export function ChatWidget({
  onSend,
  onSummarize,
  expandedPaths = [],
  suggestions = DEFAULT_SUGGESTIONS,
  title = 'Assistente Alinha',
  subtitle = 'NIS2 + RGPD',
  defaultOpen = false,
  maxConversations = 8,
  persist = 'session',
  storageKey = DEFAULT_KEY,
}: ChatWidgetProps) {
  const { pathname } = useLocation()

  const [boot] = useState(() => {
    const saved = loadSaved(persist, storageKey, maxConversations)
    if (saved) return saved
    return { v: 1 as const, conversations: [freshConversation(1, 1)], activeId: 1, open: defaultOpen }
  })
  const nextId = useRef(Math.max(100, ...boot.conversations.flatMap((c) => c.messages.map((m) => m.id))) + 1)
  const nextConvId = useRef(Math.max(...boot.conversations.map((c) => c.id)) + 1)

  const [open, setOpen] = useState(boot.open)
  const [conversations, setConversations] = useState<Conversation[]>(boot.conversations)
  const [activeId, setActiveId] = useState<number>(boot.activeId)

  const listRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Refs para os callbacks assíncronos verem sempre o estado atual
  const openRef = useRef(open)
  const activeRef = useRef(activeId)
  openRef.current = open
  activeRef.current = activeId

  const active = conversations.find((c) => c.id === activeId) ?? conversations[0]
  const expanded = expandedPaths.some((p) => (typeof p === 'string' ? pathname.includes(p) : p.test(pathname)))
  const hasUnread = conversations.some((c) => c.unread)
  const canAdd = conversations.length < maxConversations

  // Guarda sempre que algo muda
  useEffect(() => {
    writeSaved(persist, storageKey, { v: 1, conversations, activeId, open })
  }, [persist, storageKey, conversations, activeId, open])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [active.messages, active.typing, open, activeId])

  // Mantém o separador ativo visível quando há muitos
  useEffect(() => {
    tabsRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [activeId, conversations.length, open])

  // Ao abrir ou trocar de conversa: foco no input, limpa o "não lida" e Esc minimiza
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
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
          className={`overflow-hidden whitespace-nowrap text-[14px] font-bold transition-all duration-200 ${
            expanded
              ? 'ml-2.5 max-w-[200px] opacity-100'
              : 'ml-0 max-w-0 opacity-0 group-hover:ml-2.5 group-hover:max-w-[200px] group-hover:opacity-100 group-focus-visible:ml-2.5 group-focus-visible:max-w-[200px] group-focus-visible:opacity-100'
          }`}
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

  return (
    <section
      role="dialog"
      aria-label={title}
      className="fixed bottom-6 right-6 z-50 flex h-[640px] max-h-[calc(100vh-48px)] w-[400px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-[20px] border border-brand-soft bg-white shadow-[0_24px_60px_rgba(2,40,35,0.22)] max-sm:bottom-3 max-sm:right-3 max-sm:h-[calc(100vh-24px)] max-sm:w-[calc(100vw-24px)] max-sm:max-w-none"
    >
      <header className="flex items-center gap-3 bg-brand py-4 pl-[18px] pr-3 text-white">
        <span className="flex size-9 flex-none items-center justify-center rounded-full bg-white/20" aria-hidden>
          <Sparkles className="size-[18px]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <strong className="text-[15px] font-extrabold">{title}</strong>
          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/70">{subtitle}</span>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Minimizar assistente" className="flex size-11 items-center justify-center rounded-[10px] text-white/80 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">
          <Minus className="size-[18px]" aria-hidden />
        </button>
      </header>

      <div ref={tabsRef} role="tablist" aria-label="Conversas" className="flex items-center gap-1.5 overflow-x-auto border-b border-brand-soft bg-paper px-3 py-2">
        {conversations.map((c) => {
          const selected = c.id === activeId
          const label = c.topic ?? 'Nova conversa'
          return (
            <div
              key={c.id}
              className={`flex flex-none items-center rounded-full border ${selected ? 'border-brand bg-brand text-white' : 'border-brand-soft bg-white text-brand'}`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                title={label}
                onClick={() => setActiveId(c.id)}
                className={`flex min-h-10 max-w-[170px] min-w-0 items-center gap-1.5 rounded-full pl-3.5 text-[13px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${conversations.length > 1 ? 'pr-1.5' : 'pr-3.5'}`}
              >
                <span className="truncate">{label}</span>
                {c.awaitingReview && (
                  <>
                    <Clock className="size-3.5 flex-none" aria-hidden />
                    <span className="sr-only">à espera de aprovação</span>
                  </>
                )}
                {c.unread && !selected && (
                  <>
                    <span className="size-2 flex-none rounded-full bg-red-500" aria-hidden />
                    <span className="sr-only">novas mensagens</span>
                  </>
                )}
              </button>
              {conversations.length > 1 && (
                <button
                  type="button"
                  onClick={() => closeConversation(c.id)}
                  aria-label={`Fechar conversa ${label}`}
                  className="mr-1 flex size-9 flex-none items-center justify-center rounded-full hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              )}
            </div>
          )
        })}
        {canAdd && (
          <button
            type="button"
            onClick={addConversation}
            aria-label="Nova conversa"
            className="flex size-10 flex-none items-center justify-center rounded-full border border-dashed border-brand-soft bg-white text-brand hover:bg-paper-soft focus-visible:outline-2 focus-visible:outline-brand"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <div ref={listRef} role="tabpanel" aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto bg-paper-soft p-[18px]">
        {active.messages.map((m) =>
          m.role === 'notice' ? (
            <div key={m.id} role="status" className="flex items-start gap-2.5 rounded-[12px] border border-amber-200 bg-amber-50 px-3.5 py-3 text-amber-900">
              <Clock className="mt-0.5 size-4 flex-none" aria-hidden />
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em]">Em revisão</span>
                <p className="text-[13px] leading-normal">{m.text}</p>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex flex-col gap-2">
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] self-end whitespace-pre-wrap break-words rounded-[16px_16px_4px_16px] bg-brand px-3.5 py-2.5 text-[14px] leading-normal text-white'
                    : `max-w-[85%] self-start whitespace-pre-wrap break-words rounded-[16px_16px_16px_4px] border px-3.5 py-2.5 text-[14px] leading-normal ${
                        m.error ? 'border-red-200 bg-red-50 text-red-800' : 'border-brand-soft bg-white'
                      }`
                }
              >
                {m.text}
              </div>
              {m.source && (
                <Link to={m.source.to} className="flex max-w-[85%] flex-col gap-1.5 self-start rounded-[12px] border border-brand-soft bg-paper px-3.5 py-3 text-brand no-underline hover:underline">
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{m.source.label}</span>
                  <strong className="text-[14px] font-extrabold">{m.source.title}</strong>
                  <span className="text-[13px] font-bold">{m.source.cta ?? 'Abrir →'}</span>
                </Link>
              )}
            </div>
          ),
        )}

        {active.typing && (
          <div role="status" aria-label="A escrever" className="flex gap-1.5 self-start rounded-[16px_16px_16px_4px] border border-brand-soft bg-white px-4 py-3.5">
            {[0, 150, 300].map((d) => (
              <span key={d} style={{ animationDelay: `${d}ms` }} className="size-[7px] animate-bounce rounded-full bg-muted" />
            ))}
          </div>
        )}

        {active.messages.length <= 1 && !active.typing && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((s) => (
              <button key={s.label} type="button" onClick={() => send(s.label, s)} className="min-h-11 rounded-[22px] border border-brand-soft bg-white px-3.5 py-2 text-left text-[13px] font-bold text-brand hover:bg-paper">
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <footer className="flex flex-col gap-2 border-t border-brand-soft bg-white px-3.5 pb-2.5 pt-3">
        <form
          noValidate
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); send(active.draft) }}
        >
          <input
            ref={inputRef}
            value={active.draft}
            onChange={(e) => patch(active.id, (c) => ({ ...c, draft: e.target.value }))}
            placeholder="Pergunte sobre riscos, ativos ou roadmap…"
            aria-label="Escreva a sua pergunta"
            maxLength={1000}
            className="h-[46px] min-w-0 flex-1 rounded-[12px] border border-brand-soft px-3.5 text-[14px] focus-visible:outline-2 focus-visible:outline-brand"
          />
          <button
            type="submit"
            disabled={!active.draft.trim() || active.typing}
            aria-label="Enviar mensagem"
            className="flex size-[46px] flex-none items-center justify-center rounded-[12px] bg-brand text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="size-[18px]" aria-hidden />
          </button>
        </form>
        <p className="text-center text-[11px] text-muted">As respostas de IA podem conter erros. Confirme com a consultora.</p>
      </footer>
    </section>
  )
}