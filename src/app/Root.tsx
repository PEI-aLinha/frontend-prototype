import { Outlet, ScrollRestoration } from 'react-router'
import { PersonaSwitcher } from '../core/PersonaSwitcher'
import { GlobalChatWidget } from './GlobalChatWidget'

export function Root() {
  return (
    <>
      <Outlet />
      <GlobalChatWidget />
      <PersonaSwitcher />
      <ScrollRestoration />
    </>
  )
}
