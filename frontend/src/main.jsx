import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AIStatusProvider } from './aiStatusContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AIStatusProvider>
      <App />
    </AIStatusProvider>
  </StrictMode>,
)
