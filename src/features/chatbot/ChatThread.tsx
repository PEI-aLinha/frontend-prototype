import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { Check, Clock, Send, Sparkles, UserCheck } from 'lucide-react'
import type { ChatTable, Conversation, Suggestion } from './ChatTypes'
import { Button, TextInput } from '../../ui'

type ChatThreadProps = {
  /** Conversa ativa. */
  conversation: Conversation
  expanded: boolean
  suggestions: Suggestion[]
  onSend: (text: string, from?: Suggestion) => void
  onDraftChange: (text: string) => void
  /** O utilizador é consultora (pode rever conversas de clientes). */
  canReview?: boolean
  /** A conversa ativa é de um cliente e a consultora está a rever/ajudar. */
  reviewing?: boolean
  onReview?: () => void
}

const LABEL = 'font-mono text-[10px] uppercase tracking-[0.1em]'

/** Tabela de resposta do assistente (ex.: prazos legais). O texto das células quebra linha, por isso não precisa de scroll. */
function MessageTable({ table }: { table: ChatTable }) {
  const label = table.caption ?? 'Tabela'
  return (
    <div className="max-w-full self-start overflow-hidden rounded-[12px] border border-brand-soft bg-white">
      <table className="w-full border-collapse break-words text-left text-[12.5px] leading-snug">
        <caption className="sr-only">{label}</caption>
        <thead className="bg-paper">
          <tr>
            {table.columns.map((c) => (
              <th key={c} scope="col" className="px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink-soft">{c}</th>
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
export function ChatThread({ conversation: active, expanded, suggestions, onSend, onDraftChange, canReview, reviewing, onReview }: ChatThreadProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {reviewing && (
        <div role="note" className="flex items-start gap-2.5 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-900">
          <UserCheck className="mt-0.5 size-4 flex-none" aria-hidden />
          <p className="text-[12.5px] leading-normal">
            <strong>Está a ajudar um cliente.</strong> Esta conversa não é sua: o que escrever aqui é enviado ao cliente como resposta da consultora.
          </p>
        </div>
      )}

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
                    <p className="text-[13px] leading-normal">{m.text}</p>
                  </div>
                </div>
              )
            }

            const fromConsultant = m.role === 'bot' && !!m.authorId
            const fromAi = m.role === 'bot' && !m.authorId
            const bubble = m.role === 'user'
              ? 'max-w-[85%] self-end whitespace-pre-wrap break-words rounded-[16px_16px_4px_16px] bg-brand px-3.5 py-2.5 text-[14px] leading-normal text-white'
              : `max-w-[85%] self-start whitespace-pre-wrap break-words rounded-[16px_16px_16px_4px] border px-3.5 py-2.5 text-[14px] leading-normal ${
                  m.error
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : fromConsultant
                      ? 'border-brand bg-signal-soft/30'
                      : 'border-brand-soft bg-white'
                }`

            return (
              <div key={m.id} className="flex flex-col gap-1">
                {fromConsultant && (
                  <span className={`flex items-center gap-1 self-start font-bold text-brand ${LABEL}`}>
                    <UserCheck className="size-3" aria-hidden />Consultora
                  </span>
                )}
                {fromAi && !m.error && (
                  <span className={`flex items-center gap-1 self-start text-muted ${LABEL}`}>
                    <Sparkles className="size-3" aria-hidden />Assistente IA
                  </span>
                )}
                {reviewing && m.role === 'user' && (
                  <span className={`self-end text-muted ${LABEL}`}>Cliente</span>
                )}
                <div className={bubble}>{m.text}</div>
                {m.table && <MessageTable table={m.table} />}
                {m.source && (
                  <Link to={m.source.to} className="flex max-w-[85%] flex-col gap-1.5 self-start rounded-[12px] border border-brand-soft bg-paper px-3.5 py-3 text-brand no-underline hover:underline">
                    <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{m.source.label}</span>
                    <strong className="text-[14px] font-extrabold">{m.source.title}</strong>
                    <span className="text-[13px] font-bold">{m.source.cta ?? 'Abrir →'}</span>
                  </Link>
                )}
              </div>
            )
          })}

          {active.typing && (
            <div role="status" aria-label="A escrever" className="flex gap-1.5 self-start rounded-[16px_16px_16px_4px] border border-brand-soft bg-white px-4 py-3.5">
              {[0, 150, 300].map((d) => (
                <span key={d} style={{ animationDelay: `${d}ms` }} className="size-[7px] animate-bounce rounded-full bg-muted" />
              ))}
            </div>
          )}

          {active.messages.length <= 1 && !active.typing && !reviewing && (
            <div className="flex flex-wrap gap-2 pt-1">
              {suggestions.map((s) => (
                <button key={s.label} type="button" onClick={() => onSend(s.label, s)} className="min-h-11 rounded-[22px] border border-brand-soft bg-white px-3.5 py-2 text-left text-[13px] font-bold text-brand hover:bg-paper">
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className={`border-t border-brand-soft bg-white ${expanded ? 'px-6 pb-3 pt-4' : 'px-3.5 pb-2.5 pt-3'}`}>
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-2">
          {reviewing && active.awaitingReview && onReview && (
            <Button variant="secondary" size="sm" icon={<Check className="size-4" aria-hidden />} onClick={onReview}>
              Marcar como revisto
            </Button>
          )}
          {readOnly ? (
            <p className="rounded-[12px] bg-paper-soft px-3.5 py-3 text-center text-[13px] text-ink-soft">
              Conversa já revista. Só pode ver as mensagens até ao momento da revisão.
            </p>
          ) : (
            <form
              noValidate
              className="flex items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); onSend(active.draft) }}
            >
              <TextInput
                ref={inputRef}
                value={active.draft}
                onChange={(e) => onDraftChange(e.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                maxLength={1000}
                className="h-[46px] min-w-0 flex-1 rounded-[12px] border-brand-soft px-3.5 text-[14px] focus-visible:outline-2 focus-visible:outline-brand"
              />
              <Button
                type="submit"
                disabled={!active.draft.trim() || active.typing}
                aria-label="Enviar mensagem"
                className="size-[46px] flex-none !rounded-[12px] !p-0 disabled:cursor-not-allowed disabled:opacity-40"
                icon={<Send className="size-[18px]" aria-hidden />}
              >
                <span className="sr-only">Enviar</span>
              </Button>
            </form>
          )}
          {!canReview && (
            <p className="text-center text-[11px] text-muted">As respostas de IA podem conter erros. Confirme com a consultora.</p>
          )}
        </div>
      </footer>
    </div>
  )
}