import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { IconContext } from '@phosphor-icons/react'
import '@fontsource/hanken-grotesk/400.css'
import '@fontsource/hanken-grotesk/500.css'
import '@fontsource/hanken-grotesk/600.css'
import './styles/tokens.css'
import './styles/base.css'
import { router } from './app/router'
import { AuthGate } from './features/auth/AuthGate'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <IconContext.Provider value={{ size: 18, weight: 'regular' }}>
      <AuthGate>
        <RouterProvider router={router} />
      </AuthGate>
    </IconContext.Provider>
  </StrictMode>,
)
