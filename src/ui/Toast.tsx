import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from './cn'

interface ToastItem {
  id: number
  message: string
  /** success: something was done; info: something to know (a skip, a removal, a redirect); error: needs attention. */
  tone: 'success' | 'info' | 'error'
  action?: ToastAction
}

export interface ToastAction { label: string; onClick: () => void }

interface ToastApi {
  show: (message: string, tone?: ToastItem['tone'], action?: ToastAction) => void
  /** Drops every visible toast, e.g. when the demo switches persona and old messages no longer apply. */
  clear: () => void
}

const ToastContext = createContext<ToastApi | null>(null)
/** Success and info toasts go away on their own, pausing while pointed at or focused; errors stay until closed (WCAG 2.2.1). */
const DURATION_MS = 4200
const MAX_VISIBLE = 2
/** An undo toast stays a little longer: enough time to read it and reach the button. */
const UNDO_MS = 6000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const show = useCallback((message: string, tone: ToastItem['tone'] = 'success', action?: ToastAction) => {
    seq.current += 1
    const id = seq.current
    setItems((prev) => {
      // When full, the oldest plain message makes room first: an undo offer is not pushed out by a newer notice.
      const full = prev.length >= MAX_VISIBLE
      const out = full ? (prev.find((t) => !t.action) ?? prev[0]).id : null
      return [...prev.filter((t) => t.id !== out), { id, message, tone, action }]
    })
  }, [])
  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), [])
  const clear = useCallback(() => setItems([]), [])
  const value = useMemo(() => ({ show, clear }), [show, clear])
  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Errors are alerts (assertive); the rest are status messages (polite) — WCAG 4.1.3. */}
      {/* Top centre: clear of form buttons (bottom), header actions and drawers (right), the assistant (bottom right). */}
      <div className="pointer-events-none fixed left-1/2 top-5 z-[90] flex w-[min(400px,calc(100vw-40px))] -translate-x-1/2 flex-col gap-2 max-md:top-[72px]">
        {items.map((t) => <ToastRow key={t.id} item={t} onDismiss={() => dismiss(t.id)} />)}
      </div>
    </ToastContext.Provider>
  )
}

const ICON: Record<ToastItem['tone'], string> = { success: '✓', info: 'i', error: '!' }

function ToastRow({ item: t, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const total = t.action ? UNDO_MS : DURATION_MS
  const [paused, setPaused] = useState(false)
  const remaining = useRef(total)
  useEffect(() => {
    if (t.tone === 'error' || paused) return
    const started = Date.now()
    const timer = window.setTimeout(onDismiss, remaining.current)
    return () => { window.clearTimeout(timer); remaining.current -= Date.now() - started }
  }, [paused, t.tone, onDismiss])
  return (
    <div
      role={t.tone === 'error' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      className={cn('pointer-events-auto relative flex items-center overflow-hidden gap-2.5 rounded-[12px] px-4 py-3 text-[0.9375rem] font-bold text-white shadow-[0_12px_32px_rgb(var(--shadow-rgb)/0.25)] animate-pop-in', t.tone === 'error' ? 'bg-risk-high-ink pr-2' : 'bg-brand-deep')}
    >
      <span aria-hidden className={cn('font-extrabold text-signal-soft', t.tone === 'info' && 'grid size-[18px] shrink-0 place-items-center rounded-full border border-signal-soft/70 font-serif text-[0.75rem] italic')}>{ICON[t.tone]}</span>
      <span className="min-w-0 flex-1">{t.message}</span>
      {t.action && (
        <>
          <button type="button" onClick={() => { t.action!.onClick(); onDismiss() }} className="hit-slop -my-1 ml-2 rounded-[8px] px-2.5 py-1 text-signal-soft underline-offset-4 hover:bg-white/10 hover:underline focus-visible:outline-white">{t.action.label}</button>
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px] origin-left bg-signal-soft/60" style={{ animation: `drain ${UNDO_MS}ms linear forwards`, animationPlayState: paused ? 'paused' : 'running' }} />
        </>
      )}
      {t.tone === 'error' && (
        <button type="button" onClick={onDismiss} aria-label="Fechar aviso" className="-my-1 grid size-8 shrink-0 place-items-center rounded-full text-white/90 hover:bg-white/15 hover:text-white focus-visible:outline-white">
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
