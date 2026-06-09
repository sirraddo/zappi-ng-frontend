import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './dark-mode.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { AuthProvider } from './context/AuthContext'
import { PiProvider } from './context/PiContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <PiProvider>
        <AuthProvider>
        <App />
        </AuthProvider>
      </PiProvider>
    </ThemeProvider>
  </StrictMode>,
)