import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'
import { DialogProvider } from './context/DialogContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <DialogProvider>
        <App />
      </DialogProvider>
    </LanguageProvider>
  </StrictMode>,
)
