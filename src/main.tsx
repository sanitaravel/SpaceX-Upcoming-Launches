import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { injectSpeedInsights } from '@vercel/speed-insights';
import { inject } from "@vercel/analytics"

injectSpeedInsights();
inject();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
