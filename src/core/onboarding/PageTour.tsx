import { useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { Compass } from 'lucide-react'
import { Button, useToast } from '../../ui'
import { markTourSeen, resolveSteps, shouldAutoStart } from './tourState'
import { TOURS, type TourId } from './tours'

/** Lets the page settle (fonts, drawers closing) before measuring anchors. */
const AUTO_START_DELAY_MS = 400
/** ~0.5 s at 60 fps. */
const ENHANCE_MAX_FRAMES = 30

/** Intro.js leaves the dialog and close icon unnamed and focus on the page: fix the semantics and move focus into it. */
function enhanceTooltip(framesLeft = ENHANCE_MAX_FRAMES) {
  const tooltip = document.querySelector<HTMLElement>('.introjs-tooltip')
  const primary = tooltip?.querySelector<HTMLElement>('.introjs-nextbutton, .introjs-donebutton')
  // Intro.js renders asynchronously: wait for the step's buttons before patching.
  if (!tooltip || !primary) {
    if (framesLeft > 0) requestAnimationFrame(() => enhanceTooltip(framesLeft - 1))
    return
  }
  const title = tooltip.querySelector<HTMLElement>('.introjs-tooltip-title')
  if (title) {
    title.id = 'alinha-tour-title'
    tooltip.setAttribute('aria-labelledby', title.id)
  }
  const text = tooltip.querySelector<HTMLElement>('.introjs-tooltiptext')
  if (text) {
    text.id = 'alinha-tour-text'
    tooltip.setAttribute('aria-describedby', text.id)
  }
  tooltip.querySelector('.introjs-skipbutton')?.setAttribute('aria-label', 'Fechar visita guiada')
  // Intro.js ships role="progress", which is not an ARIA role.
  const progress = tooltip.querySelector('.introjs-progressbar')
  progress?.setAttribute('role', 'progressbar')
  progress?.setAttribute('aria-label', 'Progresso da visita guiada')
  primary.focus()
}

async function runTour(id: TourId, onEnd: () => void): Promise<boolean> {
  const steps = resolveSteps(TOURS[id])
  if (steps.length === 0) return false
  // Loaded on demand: the tour library stays out of the initial bundle.
  const [{ default: introJs }] = await Promise.all([
    import('intro.js'),
    import('intro.js/minified/introjs.min.css'),
  ])
  await import('./tour.css')
  const tour = introJs.tour().setOptions({
    steps,
    nextLabel: 'Seguinte',
    prevLabel: 'Anterior',
    doneLabel: 'Concluir',
    skipLabel: '×',
    stepNumbersOfLabel: 'de',
    showProgress: true,
    showBullets: false,
    exitOnOverlayClick: false,
    exitOnEsc: true,
    keyboardNavigation: true,
    scrollToElement: true,
    disableInteraction: true,
    // Plain text only: titles and descriptions never go through innerHTML.
    tooltipRenderAsHtml: false,
    tooltipClass: 'alinha-tour',
  })
  tour.onAfterChange(() => { requestAnimationFrame(() => enhanceTooltip()) })
  tour.onExit(onEnd)
  await tour.start()
  return true
}

/** "Visita guiada" button for a page; opens by itself on the first visit once the data is on screen. */
export function PageTour({ id, ready }: { id: TourId; ready: boolean }) {
  const [params] = useSearchParams()
  const toast = useToast()
  const button = useRef<HTMLButtonElement>(null)
  const started = useRef(false)

  const start = useCallback(async () => {
    started.current = true
    try {
      const shown = await runTour(id, () => {
        markTourSeen(id)
        // Back to the button (also shows where to reopen the tour), after Intro.js has removed its layers.
        requestAnimationFrame(() => button.current?.focus())
      })
      if (!shown) toast.show('Não há nada para mostrar neste ecrã de momento.', 'error')
    } catch {
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
