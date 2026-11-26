import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { RouterProvider } from 'react-router'
import { router } from './app/router'
import { SessionProvider, useSession } from './core/session'
import { ToastProvider, TooltipProvider, useToast } from './ui'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

/** Toasts belong to the persona who triggered them; switching persona in the demo starts with none. */
function ClearToastsOnPersonaChange() {
  const { persona } = useSession()
  const { clear } = useToast()
  useEffect(() => clear(), [persona.key, persona.userId, clear])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <TooltipProvider>
          <ToastProvider>
            <ClearToastsOnPersonaChange />
            <RouterProvider router={router} />
          </ToastProvider>
        </TooltipProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}
