import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Building2, Check, ChevronDown, Clock, FilePlus2, FileText, Paperclip, Send, UserCheck, X } from 'lucide-react'
import type { ChatAttachment, ChatMessage, ChatTable, Conversation, Suggestion } from './ChatTypes'
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_BYTES, attachmentUrl, formatSize } from './attachmentStore'
import { AIBadge, Button, TextInput } from '../../ui'

export type SendOptions = {
  files?: File[]
  /** Id da mensagem com o pedido de documento a que este envio responde. */
  answers?: string
}

type ChatThreadProps = {
  /** Conversa ativa. */
  conversation: Conversation
  expanded: boolean
  suggestions: Suggestion[]
  onSend: (text: string, from?: Suggestion, options?: SendOptions) => void
  onDraftChange: (text: string) => void
  /** O utilizador é consultora (pode rever conversas de clientes). */
  canReview?: boolean
  /** A conversa ativa é de um cliente e a consultora está a rever/ajudar. */
  reviewing?: boolean
  onReview?: () => void
  /** Só quando a consultora está a rever: pede um documento ao cliente. */
  onRequestDocument?: (title: string, note: string) => void
  /** Contexto da empresa do cliente (consultora a rever). No modo expandido em ecrã largo vai para a coluna da direita. */
  context?: ReactNode
}

const LABEL = 'font-mono text-[0.6875rem] uppercase tracking-[0.06em]'

const COMMON_DOCUMENTS = ['Política de segurança', 'Plano de resposta a incidentes', 'Contrato com fornecedor', 'Plano de cópias de segurança']

const UNAVAILABLE = 'Mockup: o ficheiro só fica disponível na sessão em que foi anexado.'

/** Documento anexado. Abre o ficheiro se ainda estiver em memória (mockup sem armazenamento). */
function AttachmentChip({ attachment: a, inverse }: { attachment: ChatAttachment; inverse?: boolean }) {
  const url = attachmentUrl(a.id)
  const box = `flex min-h-11 max-w-full items-center gap-2.5 rounded-[10px] border px-3 py-2 text-left no-underline ${
    inverse ? 'border-white/30 bg-white/10 text-white' : 'border-brand-soft bg-paper text-brand'
  }`
  const body = (
    <>
      <FileText className="size-4 flex-none" aria-hidden />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[0.8125rem] font-bold">{a.name}</span>
        <span className={`text-[0.6875rem] ${inverse ? 'text-white/70' : 'text-muted'}`}>{formatSize(a.size)}</span>
      </span>
    </>
  )
  return url
    ? <a href={url} target="_blank" rel="noreferrer" className={`${box} hover:underline`} aria-label={`Abrir ${a.name}`}>{body}</a>
    : <span className={box} title={UNAVAILABLE}>{body}</span>
}

/** Todos os documentos da conversa, num painel que abre e fecha. */
function ConversationDocuments({ messages }: { messages: ChatMessage[] }) {
  const [open, setOpen] = useState(false)
  const docs = messages.flatMap((m) => (m.attachments ?? []).map((a) => ({ a, m })))
  if (docs.length === 0) return null
  return (
    <div className="border-b border-brand-soft bg-paper">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center gap-2 px-4 text-[0.8125rem] font-bold text-brand hover:bg-paper-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal"
      >
        <Paperclip className="size-4" aria-hidden />
        Documentos da conversa ({docs.length})
        <ChevronDown className={`ml-auto size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <ul className="flex max-h-[180px] flex-col gap-1.5 overflow-y-auto px-4 pb-3">
          {docs.map(({ a, m }) => (
            <li key={a.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1"><AttachmentChip attachment={a} /></div>
              <span className={`flex-none text-muted ${LABEL}`}>
                {m.role === 'user' ? 'Cliente' : 'Consultora'}
                {m.createdAt && ` · ${new Date(m.createdAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Contexto do cliente numa faixa que abre e fecha (painel normal e ecrãs mais estreitos). */
function ClientContextStrip({ children, expanded }: { children: ReactNode; expanded: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`border-b border-brand-soft bg-paper ${expanded ? 'xl:hidden' : ''}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center gap-2 px-4 text-[0.8125rem] font-bold text-brand hover:bg-paper-soft focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-signal"
      >
        <Building2 className="size-4" aria-hidden />
        Contexto do cliente
        <ChevronDown className={`ml-auto size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && <div className="max-h-[min(190px,28vh)] overflow-y-auto px-4 pb-4">{children}</div>}
    </div>
  )
}

/** Cartão do pedido de documento da consultora. O cliente responde anexando o ficheiro. */
function DocumentRequestCard({ message, messages, onAnswer }: { message: ChatMessage; messages: ChatMessage[]; onAnswer?: () => void }) {
  const request = message.documentRequest!
  const sent = request.fulfilledBy ? messages.find((m) => m.id === request.fulfilledBy)?.attachments?.[0] : undefined
  return (
    <div className="flex max-w-[85%] flex-col gap-2 self-start rounded-[12px] border border-brand-soft bg-paper px-3.5 py-3">
      <span className={`flex items-center gap-1.5 text-muted ${LABEL}`}>
        <FilePlus2 className="size-3" aria-hidden />Documento pedido
      </span>
      <strong className="text-[0.9375rem] font-extrabold text-brand">{request.title}</strong>
      {request.fulfilledBy ? (
        <span className="flex items-center gap-1.5 text-[0.8125rem] font-bold text-brand">
          <Check className="size-4" aria-hidden />Enviado{sent && `: ${sent.name}`}
        </span>
      ) : onAnswer ? (
        <Button size="sm" icon={<Paperclip className="size-4" aria-hidden />} onClick={onAnswer} className="self-start">
          Enviar documento
        </Button>
      ) : (
        <span className="text-[0.8125rem] text-ink-soft">A aguardar o envio pelo cliente.</span>
      )}
    </div>
  )
}

/** Consultora: formulário curto para pedir um documento ao cliente. */
function RequestDocumentForm({ onSubmit, onCancel }: { onSubmit: (title: string, note: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  return (
    <form
      noValidate
      aria-label="Pedir documento ao cliente"
      className="flex flex-col gap-2 rounded-[12px] border border-brand-soft bg-paper p-3"
      onSubmit={(e) => { e.preventDefault(); if (title.trim()) onSubmit(title, note) }}
    >
      <span className={`text-muted ${LABEL}`}>Pedir documento ao cliente</span>
      <div className="flex flex-wrap gap-1.5">
        {COMMON_DOCUMENTS.map((d) => (
          <button key={d} type="button" aria-pressed={title === d} onClick={() => setTitle(d)}
            className={`min-h-9 rounded-full border px-3 text-[0.75rem] font-bold ${title === d ? 'border-brand bg-brand text-white' : 'border-brand-soft bg-paper text-brand hover:bg-paper-soft'}`}>
            {d}
          </button>
        ))}
      </div>
      <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Que documento?" aria-label="Que documento?" maxLength={120} autoFocus />
      <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota para o cliente (opcional)" aria-label="Nota para o cliente" maxLength={300} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" size="sm" disabled={!title.trim()}>Enviar pedido</Button>
      </div>
    </form>
  )
}

/** Tabela de resposta do assistente (ex.: prazos legais). O texto das células quebra linha, por isso não precisa de scroll. */
function MessageTable({ table }: { table: ChatTable }) {
  const label = table.caption ?? 'Tabela'
  return (
    <div className="max-w-full self-start overflow-hidden rounded-[12px] border border-brand-soft bg-paper">
      <table className="w-full border-collapse break-words text-left text-[0.7813rem] leading-snug">
        <caption className="sr-only">{label}</caption>
        <thead className="bg-paper">
          <tr>
            {table.columns.map((c) => (
              <th key={c} scope="col" className="px-3 py-2 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-ink-soft">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr key={r} className="border-t border-brand-soft align-top">
              {row.map((cell, i) => i === 0
                ? <th key={i} scope="row" className="px-3 py-2.5 font-bold text-brand">{cell}</th>
                : <td key={i} className="px-3 py-2.5 text-ink">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Mensagens da conversa ativa + campo de escrita. */
export function ChatThread({ conversation: active, expanded, suggestions, onSend, onDraftChange, canReview, reviewing, onReview, onRequestDocument, context }: ChatThreadProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  /** Ficheiros escolhidos e ainda não enviados (o ChatThread é remontado ao trocar de conversa). */
  const [pending, setPending] = useState<File[]>([])
  const [fileError, setFileError] = useState('')
  /** Pedido de documento a que o próximo ficheiro escolhido responde (envia logo). */
  const answering = useRef<string | undefined>(undefined)
  const [requesting, setRequesting] = useState(false)

  const pickFiles = (answers?: string) => {
    answering.current = answers
    fileRef.current?.click()
  }

  const onFiles = (list: FileList | null) => {
    const files = [...(list ?? [])]
    if (fileRef.current) fileRef.current.value = ''
    const tooBig = files.filter((f) => f.size > MAX_ATTACHMENT_BYTES)
    const ok = files.filter((f) => f.size <= MAX_ATTACHMENT_BYTES)
    setFileError(tooBig.length ? `${tooBig.map((f) => f.name).join(', ')}: máximo de ${formatSize(MAX_ATTACHMENT_BYTES)} por ficheiro.` : '')
    if (ok.length === 0) return
    if (answering.current) {
      onSend('', undefined, { files: ok.slice(0, 1), answers: answering.current })
      answering.current = undefined
      return
    }
    setPending((prev) => [...prev, ...ok])
  }

  const submit = () => {
    if (!active.draft.trim() && pending.length === 0) return
    onSend(active.draft, undefined, { files: pending })
    setPending([])
    setFileError('')
  }

  // Só é "readOnly" se for uma conversa de cliente que já veio do servidor e já não está à espera de revisão
  const readOnly = !!reviewing && !!active.serverUpdatedAt && !active.awaitingReview
  // O aviso "Em revisão" é para o cliente; a consultora não precisa dele
  const messages = canReview ? active.messages.filter((m) => m.role !== 'notice') : active.messages

  // Scroll automático para a última mensagem
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [active.messages, active.typing, active.id, expanded])

  // Foco no input ao abrir o painel e ao trocar de conversa
  useEffect(() => {
    inputRef.current?.focus()
  }, [active.id])

  const placeholder = reviewing ? 'Escreva a sua resposta ao cliente…' : 'Pergunte sobre riscos, ativos ou roadmap…'
  const iconBtn = 'flex size-[46px] flex-none items-center justify-center rounded-[12px] border border-brand-soft bg-paper text-brand hover:bg-paper-soft focus-visible:outline-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {reviewing && (
        <div role="note" className="flex items-start gap-2.5 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-900">
          <UserCheck className="mt-0.5 size-4 flex-none" aria-hidden />
          <p className="text-[0.7813rem] leading-normal">
            <strong>Está a ajudar um cliente.</strong> Esta conversa não é sua: o que escrever aqui é enviado ao cliente como resposta da consultora.
          </p>
        </div>
      )}

      {context && <ClientContextStrip expanded={expanded}>{context}</ClientContextStrip>}
      <ConversationDocuments messages={active.messages} />

      <div
        ref={listRef}
        role="tabpanel"
        aria-live="polite"
        className={`min-h-0 flex-1 overflow-y-auto bg-paper-soft ${expanded ? 'p-6 md:px-8' : 'p-[18px]'}`}
      >
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-3.5">
          {messages.map((m) => {
            if (m.role === 'notice') {
              return (
                <div key={m.id} role="status" className="flex items-start gap-2.5 rounded-[12px] border border-amber-200 bg-amber-50 px-3.5 py-3 text-amber-900">
                  <Clock className="mt-0.5 size-4 flex-none" aria-hidden />
                  <div className="flex flex-col gap-1">
                    <span className={LABEL}>Em revisão</span>
                    <p className="text-[0.8125rem] leading-normal">{m.text}</p>
                  </div>
                </div>
              )
            }

            const fromConsultant = m.role === 'bot' && !!m.authorId
            const fromAi = m.role === 'bot' && !m.authorId
            const bubble = m.role === 'user'
              ? 'max-w-[85%] self-end whitespace-pre-wrap break-words rounded-[16px_16px_4px_16px] bg-brand px-3.5 py-2.5 text-[0.9375rem] leading-normal text-white'
              : `max-w-[85%] self-start whitespace-pre-wrap break-words rounded-[16px_16px_16px_4px] border px-3.5 py-2.5 text-[0.9375rem] leading-normal ${
                  m.error
                    ? 'border-danger/40 bg-risk-high text-risk-high-ink'
                    : fromConsultant
                      ? 'border-brand bg-signal-soft/30'
                      : 'border-brand-soft bg-paper'
                }`

            return (
              <div key={m.id} className="flex flex-col gap-1">
                {fromConsultant && (
                  <span className={`flex items-center gap-1 self-start font-bold text-brand ${LABEL}`}>
                    <UserCheck className="size-3" aria-hidden />Consultora
                  </span>
                )}
                {fromAi && !m.error && (
                  <span className="self-start"><AIBadge kind="info" /></span>
                )}
                {reviewing && m.role === 'user' && (
                  <span className={`self-end text-muted ${LABEL}`}>Cliente</span>
                )}
                {m.text && <div className={bubble}>{m.text}</div>}
                {m.attachments && m.attachments.length > 0 && (
                  <ul aria-label="Documentos anexados" className={`flex max-w-[85%] flex-col gap-1.5 ${m.role === 'user' ? 'self-end' : 'self-start'}`}>
                    {m.attachments.map((a) => <li key={a.id}><AttachmentChip attachment={a} inverse={m.role === 'user'} /></li>)}
                  </ul>
                )}
                {m.documentRequest && (
                  <DocumentRequestCard
                    message={m}
                    messages={active.messages}
                    onAnswer={!reviewing && !canReview && !active.typing ? () => pickFiles(m.id) : undefined}
                  />
                )}
                {m.table && <MessageTable table={m.table} />}
                {m.source && (
                  <Link to={m.source.to} className="flex max-w-[85%] flex-col gap-1.5 self-start rounded-[12px] border border-brand-soft bg-paper px-3.5 py-3 text-brand no-underline hover:underline">
                    <span className="font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-muted">{m.source.label}</span>
                    <strong className="text-[0.9375rem] font-extrabold">{m.source.title}</strong>
                    <span className="text-[0.8125rem] font-bold">{m.source.cta ?? 'Abrir →'}</span>
                  </Link>
                )}
              </div>
            )
          })}

          {active.typing && (
            <div role="status" aria-label="A escrever" className="flex gap-1.5 self-start rounded-[16px_16px_16px_4px] border border-brand-soft bg-paper px-4 py-3.5">
              {[0, 150, 300].map((d) => (
                <span key={d} style={{ animationDelay: `${d}ms` }} className="size-[7px] animate-bounce rounded-full bg-muted" />
              ))}
            </div>
          )}

          {active.messages.length <= 1 && !active.typing && !reviewing && (
            <div className="flex flex-wrap gap-2 pt-1">
              {suggestions.map((s) => (
                <button key={s.label} type="button" onClick={() => onSend(s.label, s)} className="min-h-11 rounded-[22px] border border-brand-soft bg-paper px-3.5 py-2 text-left text-[0.8125rem] font-bold text-brand hover:bg-paper">
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className={`border-t border-brand-soft bg-paper ${expanded ? 'px-6 pb-3 pt-4' : 'px-3.5 pb-2.5 pt-3'}`}>
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-2">
          {reviewing && active.awaitingReview && onReview && (
            <Button variant="secondary" size="sm" icon={<Check className="size-4" aria-hidden />} onClick={onReview}>
              Marcar como revisto
            </Button>
          )}
          {requesting && onRequestDocument && (
            <RequestDocumentForm
              onCancel={() => setRequesting(false)}
              onSubmit={(title, note) => { onRequestDocument(title, note); setRequesting(false) }}
            />
          )}
          {pending.length > 0 && (
            <ul aria-label="Ficheiros por enviar" className="flex flex-wrap gap-1.5">
              {pending.map((f, i) => (
                <li key={`${f.name}-${i}`} className="flex max-w-full items-center gap-1.5 rounded-full border border-brand-soft bg-paper py-1 pl-3 pr-1 text-[0.75rem] font-bold text-brand">
                  <FileText className="size-3.5 flex-none" aria-hidden />
                  <span className="truncate">{f.name}</span>
                  <span className="flex-none font-normal text-muted">{formatSize(f.size)}</span>
                  <button type="button" aria-label={`Remover ${f.name}`} onClick={() => setPending((prev) => prev.filter((_, j) => j !== i))}
                    className="flex size-7 flex-none items-center justify-center rounded-full hover:bg-black/10 focus-visible:outline-2 focus-visible:outline-signal">
                    <X className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {fileError && <p role="alert" className="text-[0.8125rem] font-semibold text-danger">{fileError}</p>}
          <input ref={fileRef} type="file" multiple accept={ATTACHMENT_ACCEPT} className="hidden" tabIndex={-1} aria-hidden onChange={(e) => onFiles(e.target.files)} />
          {readOnly ? (
            <p className="rounded-[12px] bg-paper-soft px-3.5 py-3 text-center text-[0.8125rem] text-ink-soft">
              Conversa já revista. Só pode ver as mensagens até ao momento da revisão.
            </p>
          ) : (
            <form
              noValidate
              className="flex items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); submit() }}
            >
              <button type="button" onClick={() => pickFiles()} disabled={active.typing} aria-label="Anexar documento" title="Anexar documento" className={iconBtn}>
                <Paperclip className="size-[18px]" aria-hidden />
              </button>
              {onRequestDocument && (
                <button type="button" onClick={() => setRequesting((v) => !v)} aria-pressed={requesting} aria-label="Pedir documento ao cliente" title="Pedir documento ao cliente" className={iconBtn}>
                  <FilePlus2 className="size-[18px]" aria-hidden />
                </button>
              )}
              <TextInput
                ref={inputRef}
                value={active.draft}
                onChange={(e) => onDraftChange(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                maxLength={1000}
                className="h-[46px] min-w-0 flex-1 rounded-[12px] border-brand-soft px-3.5 text-[0.8125rem] focus-visible:outline-2 focus-visible:outline-signal"
              />
              <Button
                type="submit"
                disabled={(!active.draft.trim() && pending.length === 0) || active.typing}
                aria-label="Enviar mensagem"
                className="size-[46px] flex-none !rounded-[12px] !p-0 disabled:cursor-not-allowed disabled:opacity-40"
                icon={<Send className="size-[18px]" aria-hidden />}
              >
                <span className="sr-only">Enviar</span>
              </Button>
            </form>
          )}
          {!canReview && (
            <p className="text-center text-[0.6875rem] text-muted">As respostas de IA podem conter erros. Confirme com a consultora.</p>
          )}
        </div>
      </footer>
    </div>
  )
}