import { useEffect, useRef } from 'react'
import { useLocation, useMatches, useNavigationType } from 'react-router'

export interface RouteHandle {
  title?: string
}

const APP_NAME = 'aLinha'
const FALLBACK_TITLE = 'aLinha · Riscos e Ativos'
/** Pages load their data first; give the h1 this long to show up before falling back to <main>. */
const WAIT_FOR_HEADING_MS = 3000
const POLL_MS = 50

function focusPageHeading() {
  const started = Date.now()
  let timer = 0
  const tick = () => {
    const target = document.querySelector<HTMLElement>('main h1') ?? (Date.now() - started > WAIT_FOR_HEADING_MS ? document.querySelector<HTMLElement>('main') : null)
    if (!target) { timer = window.setTimeout(tick, POLL_MS); return }
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
  }
  tick()
  return () => window.clearTimeout(timer)
}

/**
 * One title per route (WCAG 2.4.2), and on navigation focus moves to the new page's h1 so screen
 * readers announce it instead of staying on the link that was followed.
 */
export function RouteAnnouncer() {
  const matches = useMatches()
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  const title = matches.map((m) => (m.handle as RouteHandle | undefined)?.title).filter(Boolean).at(-1)

  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : FALLBACK_TITLE
  }, [title])

  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    // Redirects (e.g. "/" → home) replace the entry: that is still the initial load, leave focus alone.
    if (navigationType === 'REPLACE') return
    return focusPageHeading()
  }, [pathname, navigationType])

  return null
}
