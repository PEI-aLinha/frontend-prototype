import { Outlet, ScrollRestoration } from 'react-router'
import { PersonaSwitcher } from '../core/PersonaSwitcher'
import { useSession } from '../core/session'
import { ChatWidget } from '../features/chatbot/ChatWidget'

export function Root() {
  const { persona } = useSession()
  return (
    <>
      <Outlet />
      <ChatWidget 
        key={`chat-${persona.key}`}
        storageKey={`alinha-chat:${persona.key}`}
      />
      <PersonaSwitcher />
      <ScrollRestoration />
    </>
  )
}
