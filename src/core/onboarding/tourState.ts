import type { TourStepDef } from './tours'

const storageKey = (id: string) => `alinha-tour-${id}`

/** Query parameters that mean a drawer or modal is open: a tour must not start on top of them. */
const OVERLAY_PARAMS = ['novo', 'risco', 'ativo', 'atribuir', 'importar', 'exportar', 'servicos']

export function hasSeenTour(id: string): boolean {
  try {
    return localStorage.getItem(storageKey(id)) === 'done'
  } catch {
    // No storage (private mode): treat as seen so the tour does not reopen on every visit.
    return true
  }
}

export function markTourSeen(id: string): void {
  try {
    localStorage.setItem(storageKey(id), 'done')
  } catch {
    // no persistence: the button still relaunches it
  }
}

/** First visit, nothing open on top, not an automated browser (tests, Lighthouse); `?tour=1` forces, `?tour=0` blocks. */
export function shouldAutoStart(id: string, search: URLSearchParams, automated: boolean): boolean {
  const flag = search.get('tour')
  if (flag === '1') return true
  if (flag === '0' || automated) return false
  if (OVERLAY_PARAMS.some((p) => search.has(p))) return false
  return !hasSeenTour(id)
}

export interface ResolvedStep {
  element?: HTMLElement
  title: string
  intro: string
}

const isVisible = (el: HTMLElement) => el.getClientRects().length > 0

/** Keeps centred steps and steps whose anchor is on screen (desktop and mobile show different elements). */
export function resolveSteps(steps: TourStepDef[], root: ParentNode = document): ResolvedStep[] {
  return steps.flatMap((s) => {
    if (!s.target) return [{ title: s.title, intro: s.intro }]
    const el = [...root.querySelectorAll<HTMLElement>(`[data-tour="${s.target}"]`)].find(isVisible)
    return el ? [{ element: el, title: s.title, intro: s.intro }] : []
  })
}
