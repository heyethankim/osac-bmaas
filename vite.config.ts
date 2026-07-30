import { execSync } from 'node:child_process'
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

const LANDING_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/New_York',
}

/** Landing footer date — bump when shipping a prototype update. */
const LANDING_LAST_UPDATED_LABEL = 'July 30, 2026'

/** Prefer explicit label; fall back to latest git commit or today. */
function getLandingLastUpdatedLabel(): string {
  if (LANDING_LAST_UPDATED_LABEL.trim()) {
    return LANDING_LAST_UPDATED_LABEL
  }

  try {
    const iso = execSync('git log -1 --format=%cI', { encoding: 'utf8' }).trim()
    const commitDate = new Date(iso)
    if (!Number.isNaN(commitDate.getTime())) {
      return commitDate.toLocaleDateString('en-US', LANDING_DATE_FORMAT)
    }
  } catch {
    /* git unavailable in some build environments */
  }

  return new Date().toLocaleDateString('en-US', LANDING_DATE_FORMAT)
}

export default defineConfig({
  base,
  define: {
    __BMAAS_LANDING_LAST_UPDATED__: JSON.stringify(getLandingLastUpdatedLabel()),
  },
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5184,
    strictPort: false,
    open: true,
  },
})
