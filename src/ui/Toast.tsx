import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from './cn'

interface ToastItem {
  id: number
  message: string
  tone: 'success' | 'error'
}

interface ToastApi {
  show: (message: string, tone?: ToastItem['tone']) => void
}

const ToastContext = createContext<ToastApi | null>(null)
/** Success toasts go away on their own; errors stay until closed, so nobody misses them (WCAG 2.2.1). */
const DURATION_MS = 4200
const MAX_VISIBLE = 3

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const show = useCallback((message: string, tone: ToastItem['tone'] = 'success') => {
    seq.current += 1
    const id = seq.current
    setItems((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, message, tone }])
    if (tone === 'success') window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), DURATION_MS)
  }, [])
  const dismiss = useCallback((id: number) => setItems((prev) => prev.filter((t) => t.id !== id)), [])
  const value = useMemo(() => ({ show }), [show])
  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Bottom-left corner of the content area (after the 232 px navigation). Errors are alerts (assertive),
          successes are status messages (polite) — WCAG 4.1.3. */}
      <div className="pointer-events-none fixed bottom-6 left-[288px] z-[90] flex flex-col gap-2 max-md:bottom-auto max-md:left-5 max-md:right-5 max-md:top-[72px]">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn('pointer-events-auto flex items-center gap-2.5 rounded-[12px] px-4 py-3 text-[14px] font-bold text-white shadow-[0_12px_32px_rgba(6,54,50,0.25)] animate-pop-in', t.tone === 'error' ? 'bg-risk-high-ink pr-2' : 'bg-brand-deep')}
          >
            <span aria-hidden className="font-extrabold text-signal-soft">{t.tone === 'error' ? '!' : '✓'}</span>
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.tone === 'error' && (
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Fechar aviso" className="-my-1 grid size-8 shrink-0 place-items-center rounded-full text-white/90 hover:bg-white/15 hover:text-white focus-visible:outline-white">
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
