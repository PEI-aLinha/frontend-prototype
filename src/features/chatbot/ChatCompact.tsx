import { useEffect, useRef } from 'react'
import { Clock, Plus, X } from 'lucide-react'
import { ChatThread } from './ChatThread'
import type { Conversation, Suggestion } from './ChatTypes'

export type ConversationNavProps = {
  conversations: Conversation[]
  activeId: string
  canAdd: boolean
  onSelect: (id: string) => void
  onAdd: () => void
  onClose: (id: string) => void
}

export type ChatBodyProps = ConversationNavProps & {
  /** Conversa ativa. */
  conversation: Conversation
  suggestions: Suggestion[]
  onSend: (text: string, from?: Suggestion) => void
  onDraftChange: (text: string) => void
  canReview?: boolean
  onReview?: () => void
}

/** Ícone de "à espera de aprovação" e ponto de "mensagens novas". Partilhado com a barra lateral do modo expandido. */
export function ConversationBadges({ conversation: c, selected }: { conversation: Conversation; selected: boolean }) {
  return (
    <>
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
    </>
  )
}

/** Mantém o item ativo visível quando a lista tem scroll. */
// eslint-disable-next-line react-refresh/only-export-components
export function useScrollActiveIntoView(activeId: string, count: number) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const selected = ref.current?.querySelector('[aria-selected="true"]')
    if (selected instanceof HTMLElement && typeof selected.scrollIntoView === 'function') {
      selected.scrollIntoView({ inline: 'nearest', block: 'nearest' })
    }
  }, [activeId, count])
  return ref
}

/** Separadores horizontais. Usados no painel normal e, em ecrãs pequenos, no expandido. */
export function ConversationTabs({ conversations, activeId, canAdd, onSelect, onAdd, onClose }: ConversationNavProps) {
  const ref = useScrollActiveIntoView(activeId, conversations.length)
  return (
    <div ref={ref} role="tablist" aria-label="Conversas" className="flex items-center gap-1.5 overflow-x-auto border-b border-brand-soft bg-paper px-3 py-2">
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
              onClick={() => onSelect(c.id)}
              className={`flex min-h-10 max-w-[170px] min-w-0 items-center gap-1.5 rounded-full pl-3.5 text-[13px] font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${conversations.length > 1 ? 'pr-1.5' : 'pr-3.5'}`}
            >
              <span className="truncate">{label}</span>
              <ConversationBadges conversation={c} selected={selected} />
            </button>
            {conversations.length > 1 && (
              <button
                type="button"
                onClick={() => onClose(c.id)}
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
          onClick={onAdd}
          aria-label="Nova conversa"
          className="flex size-10 flex-none items-center justify-center rounded-full border border-dashed border-brand-soft bg-white text-brand hover:bg-paper-soft focus-visible:outline-2 focus-visible:outline-brand"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      )}
    </div>
  )
}

/** Versão normal (painel pequeno): separadores no topo e conversa por baixo. */
export function ChatCompact({ conversation, suggestions, onSend, onDraftChange, canReview, onReview, ...nav }: ChatBodyProps) {
  return (
    <>
      <ConversationTabs {...nav} />
      <div className="flex min-h-0 flex-1">
        <ChatThread
          conversation={conversation}
          expanded={false}
          suggestions={suggestions}
          onSend={onSend}
          onDraftChange={onDraftChange}
          canReview={canReview}
          onReview={onReview}
        />
      </div>
    </>
  )
}