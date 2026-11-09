import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './dark-mode.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

import { PiProvider } from './context/PiContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <PiProvider>
        
        <App />
        
      </PiProvider>
    </ThemeProvider>
  </StrictMode>,
)

// Wake the free-tier backend as soon as the app opens, so the first sign-in or
// payment doesn't wait on a cold start. Failures are harmless.
try {
  const api = import.meta.env.VITE_API_URL || 'https://zappi-ng-backend-1.onrender.com'
  fetch(`${api}/health`, { cache: 'no-store' }).catch(() => {})
} catch { /* ignore */ }
