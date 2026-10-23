import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { Compass } from 'lucide-react'
import { Button, useToast } from '../../ui'
import { markTourSeen, resolveSteps, shouldAutoStart } from './tourState'
import { TOURS, type TourId } from './tours'
import type { PopoverDOM } from 'driver.js'

/** Lets the page settle (fonts, drawers closing) before measuring anchors. */
const AUTO_START_DELAY_MS = 400

/** Driver.js writes titles and descriptions with innerHTML: tour text goes in as plain text only. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

/** Driver.js already renders a labelled dialog and traps Tab; finish the semantics and lead with the primary button. */
function enhancePopover({ wrapper, title, footer, nextButton }: PopoverDOM) {
  wrapper.setAttribute('aria-modal', 'true')
  // <header> and <footer> outside a section would read as page landmarks.
  title.setAttribute('role', 'heading')
  title.setAttribute('aria-level', '2')
  footer.setAttribute('role', 'none')
  // Driver.js focuses the first control (the close icon) after this hook runs.
  requestAnimationFrame(() => nextButton.focus())
}

/** Runs the tour; `signal` aborts it (page left or persona changed) while loading or on screen. */
async function runTour(id: TourId, onEnd: () => void, signal: AbortSignal): Promise<boolean> {
  const steps = resolveSteps(TOURS[id])
  if (steps.length === 0) return false
  // Loaded on demand: the tour library stays out of the initial bundle.
  const [{ driver }] = await Promise.all([
    import('driver.js'),
    import('driver.js/dist/driver.css'),
  ])
  await import('./tour.css')
  if (signal.aborted) return false
  const tour = driver({
    steps: steps.map((st) => ({ element: st.element, popover: { title: escapeHtml(st.title), description: escapeHtml(st.intro) } })),
    nextBtnText: 'Seguinte',
    prevBtnText: 'Anterior',
    doneBtnText: 'Concluir',
    closeBtnLabel: 'Fechar visita guiada',
    progressText: '{{current}} de {{total}}',
    showProgress: true,
    allowClose: true,
    allowKeyboardControl: true,
    overlayClickBehavior: 'none',
    disableActiveInteraction: true,
    animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    overlayColor: 'var(--color-ink)',
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 14,
    popoverClass: 'alinha-tour',
    onPopoverRender: enhancePopover,
    onDestroyed: onEnd,
  })
  signal.addEventListener('abort', () => tour.destroy(), { once: true })
  tour.drive()
  return true
}

/** "Visita guiada" button for a page; opens by itself on the first visit once the data is on screen. */
export function PageTour({ id, ready }: { id: TourId; ready: boolean }) {
  const [params] = useSearchParams()
  const toast = useToast()
  const button = useRef<HTMLButtonElement>(null)
  const started = useRef(false)
  const running = useRef<AbortController | null>(null)

  // The overlay must not outlive the page that opened it.
  useEffect(() => () => running.current?.abort(), [id])

  const start = useCallback(async () => {
    started.current = true
    running.current?.abort()
    const controller = new AbortController()
    running.current = controller
    const { signal } = controller
    try {
      const shown = await runTour(id, () => {
        // Closed because the page went away: the person did not finish it here.
        if (signal.aborted) return
        markTourSeen(id)
        // Back to the button (also shows where to reopen the tour), after Driver.js has removed its layers.
        requestAnimationFrame(() => button.current?.focus())
      }, signal)
      if (signal.aborted) return
      if (!shown) toast.show('Não há nada para mostrar neste ecrã de momento.', 'error')
    } catch {
      if (signal.aborted) return
      toast.show('Não foi possível abrir a visita guiada. Tente outra vez.', 'error')
    }
  }, [id, toast])

  useEffect(() => {
    if (!ready || started.current || !shouldAutoStart(id, params, navigator.webdriver)) return
    const timer = window.setTimeout(start, AUTO_START_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [ready, id, params, start])

  return (
    <Button ref={button} variant="ghost" size="sm" icon={<Compass className="size-4" aria-hidden />} onClick={start} disabled={!ready}>
      Visita guiada
    </Button>
  )
}
