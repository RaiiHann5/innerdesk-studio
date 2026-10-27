import type { ReactNode } from 'react'

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 md:p-6">{children}</div>
}
