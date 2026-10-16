import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
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
const DURATION_MS = 4200

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const show = useCallback((message: string, tone: ToastItem['tone'] = 'success') => {
    seq.current += 1
    const id = seq.current
    setItems((prev) => [...prev.slice(-2), { id, message, tone }])
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), DURATION_MS)
  }, [])
  const value = useMemo(() => ({ show }), [show])
  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Canto inferior esquerdo da área de conteúdo (depois da navegação de 232 px). */}
      <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-[288px] z-[90] flex flex-col gap-2 max-md:bottom-auto max-md:left-5 max-md:right-5 max-md:top-[72px]">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn('pointer-events-auto flex items-center gap-2.5 rounded-[12px] px-4 py-3 text-[14px] font-bold text-white shadow-[0_12px_32px_rgba(6,54,50,0.25)] animate-pop-in', t.tone === 'error' ? 'bg-risk-high-ink' : 'bg-brand-deep')}
          >
            <span aria-hidden className="font-extrabold text-signal-soft">{t.tone === 'error' ? '!' : '✓'}</span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast fora de ToastProvider')
  return ctx
}
