import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@patternfly/react-core/dist/styles/base.css'
import './index.css'
import './login.css'
import './provider-admin.css'
import './tenant-shell.css'
import './tenant-admin.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
