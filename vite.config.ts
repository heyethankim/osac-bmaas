import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves at /<repo-name>/; local dev uses "/".
// CI sets BASE_PATH (see .github/workflows/deploy-pages.yml).
const base =
  process.env.BASE_PATH && process.env.BASE_PATH !== '/'
    ? process.env.BASE_PATH.endsWith('/')
      ? process.env.BASE_PATH
      : `${process.env.BASE_PATH}/`
    : '/'

const BMAAS_LANDING_LAST_UPDATED_LABEL = 'July 27, 2026'

export default defineConfig({
  base,
  define: {
    __BMAAS_LANDING_LAST_UPDATED__: JSON.stringify(BMAAS_LANDING_LAST_UPDATED_LABEL),
  },
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5184,
    strictPort: false,
    open: true,
  },
})
