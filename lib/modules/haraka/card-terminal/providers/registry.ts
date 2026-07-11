import type { CardTerminalProvider } from './provider.interface'
import type { CardTerminalProvider as ProviderType } from '@/types/pos.types'
import { SumUpProvider } from './sumup'
import { SquareProvider } from './square'
import { PaymobProvider } from './paymob'

const providers: Record<string, CardTerminalProvider> = {
  sumup: new SumUpProvider(),
  square: new SquareProvider(),
  paymob: new PaymobProvider(),
}

export function getProvider(provider: ProviderType | null): CardTerminalProvider | null {
  if (!provider) return null
  return providers[provider] ?? null
}
