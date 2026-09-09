import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@patternfly/react-core/dist/styles/base.css'
import '@patternfly/react-topology/dist/esm/css/topology-components.css'
import '@patternfly/react-topology/dist/esm/css/topology-controlbar.css'
import '@patternfly/react-topology/dist/esm/css/topology-side-bar.css'
import '@patternfly/react-topology/dist/esm/css/topology-view.css'
import './index.css'
import './login.css'
import './provider-admin.css'
import './tenant-shell.css'
import './tenant-admin.css'
import './catalog.css'
import App from './App.tsx'
import { ThemePreferencesProvider } from './theme/themePreferences'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemePreferencesProvider>
      <App />
    </ThemePreferencesProvider>
  </StrictMode>,
)
