import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { Clock, Send } from 'lucide-react'
import type { Conversation, Suggestion } from './ChatTypes'

type ChatThreadProps = {
  /** Conversa ativa. */
  conversation: Conversation
  expanded: boolean
  suggestions: Suggestion[]
  onSend: (text: string, from?: Suggestion) => void
  onDraftChange: (text: string) => void
}

/** Mensagens da conversa ativa + campo de escrita. */
export function ChatThread({ conversation: active, expanded, suggestions, onSend, onDraftChange }: ChatThreadProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll automático para a última mensagem
  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [active.messages, active.typing, active.id, expanded])

  // Foco no input ao abrir o painel e ao trocar de conversa
  useEffect(() => {
    inputRef.current?.focus()
  }, [active.id])

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div
        ref={listRef}
        role="tabpanel"
        aria-live="polite"
        className={`min-h-0 flex-1 overflow-y-auto bg-paper-soft ${expanded ? 'p-6 md:px-8' : 'p-[18px]'}`}
      >
        <div className="mx-auto flex w-full max-w-[760px] flex-col gap-3.5">
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
          <form
            noValidate
            className="flex items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); onSend(active.draft) }}
          >
            <input
              ref={inputRef}
              value={active.draft}
              onChange={(e) => onDraftChange(e.target.value)}
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
        </div>
      </footer>
    </div>
  )
}