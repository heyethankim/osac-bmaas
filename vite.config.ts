import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base =
  process.env.BASE_PATH && process.env.BASE_PATH !== '/'
    ? process.env.BASE_PATH.endsWith('/')
      ? process.env.BASE_PATH
      : `${process.env.BASE_PATH}/`
    : '/'

const BMAAS_LANDING_LAST_UPDATED_LABEL = new Date().toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/New_York',
})

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
