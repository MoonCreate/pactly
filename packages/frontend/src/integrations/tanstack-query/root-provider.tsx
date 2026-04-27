import { QueryClient } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { useEffect, type ReactNode } from 'react'
import { initAppKit } from '../../lib/appkit'
import { wagmiConfig } from '../../lib/wagmi'

export function getContext() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000 },
    },
  })
  return { queryClient }
}

export default function TanstackQueryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initAppKit()
  }, [])
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
}
