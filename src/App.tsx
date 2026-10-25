import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { router } from './app/router'
import { SessionProvider } from './core/session'
import { ToastProvider, TooltipProvider } from './ui'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <TooltipProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </TooltipProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}
