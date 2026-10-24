import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { PersonaSwitcher } from '../core/PersonaSwitcher'
import { RouteAnnouncer } from './RouteAnnouncer'
import { GlobalChatWidget } from './GlobalChatWidget'

/** Rotas sem sessão (registo, convite, página de design): o assistente não aparece. */
const NO_CHAT = ['/registo', '/convite', '/_design']

export function Root() {
  const { pathname } = useLocation()
  const showChat = !NO_CHAT.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  return (
    <>
      <Outlet />
      {showChat && <GlobalChatWidget />}
      <PersonaSwitcher />
      <ScrollRestoration />
      <RouteAnnouncer />
    </>
  )
}
