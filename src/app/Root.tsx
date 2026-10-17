import { Outlet, ScrollRestoration } from 'react-router'
import { PersonaSwitcher } from '../core/PersonaSwitcher'
import { ChatWidget } from '../features/chatbot/ChatWidget'

export function Root() {
  return (
    <>
      <Outlet />
      <ChatWidget />
      <PersonaSwitcher />
      <ScrollRestoration />
    </>
  )
}
