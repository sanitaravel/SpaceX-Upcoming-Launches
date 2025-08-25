import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { injectSpeedInsights } from '@vercel/speed-insights';
import { Analytics } from "@vercel/analytics/react"

injectSpeedInsights();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
