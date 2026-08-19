import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react'

export type ColorScheme = 'light' | 'dark'
export type ContrastMode = 'default' | 'high-contrast' | 'glass'

export type ColorSchemePreference = 'system' | ColorScheme
export type ContrastModePreference = 'system' | ContrastMode

const COLOR_SCHEME_STORAGE_KEY = 'osac-bmaas.color-scheme.v2'
const CONTRAST_MODE_STORAGE_KEY = 'osac-bmaas.contrast-mode'

const DEFAULT_COLOR_SCHEME_PREFERENCE: ColorSchemePreference = 'light'
const DEFAULT_CONTRAST_MODE_PREFERENCE: ContrastModePreference = 'system'

function matchesMediaQuery(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  try {
    return window.matchMedia(query).matches
  } catch {
    return false
  }
}

function getSystemColorScheme(): ColorScheme {
  return matchesMediaQuery('(prefers-color-scheme: dark)') ? 'dark' : 'light'
}

// PatternFly's glass contrast mode has no direct OS equivalent, so when the
// system has no stated preference we fall back to glass to showcase it.
function getSystemContrastMode(): ContrastMode {
  if (matchesMediaQuery('(forced-colors: active)') || matchesMediaQuery('(prefers-contrast: more)')) {
    return 'high-contrast'
  }
  if (matchesMediaQuery('(prefers-reduced-transparency: reduce)')) {
    return 'default'
  }
  return 'glass'
}

function readStoredColorSchemePreference(): ColorSchemePreference {
  try {
    const stored = window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)
    return stored === 'system' || stored === 'light' || stored === 'dark'
      ? stored
      : DEFAULT_COLOR_SCHEME_PREFERENCE
  } catch {
    return DEFAULT_COLOR_SCHEME_PREFERENCE
  }
}

function readStoredContrastModePreference(): ContrastModePreference {
  try {
    const stored = window.localStorage.getItem(CONTRAST_MODE_STORAGE_KEY)
    return stored === 'system' || stored === 'default' || stored === 'high-contrast' || stored === 'glass'
      ? stored
      : DEFAULT_CONTRAST_MODE_PREFERENCE
  } catch {
    return DEFAULT_CONTRAST_MODE_PREFERENCE
  }
}

type ThemePreferencesContextValue = {
  colorSchemePreference: ColorSchemePreference
  setColorSchemePreference: (preference: ColorSchemePreference) => void
  contrastModePreference: ContrastModePreference
  setContrastModePreference: (preference: ContrastModePreference) => void
}

const ThemePreferencesContext = createContext<ThemePreferencesContextValue | null>(null)

export function ThemePreferencesProvider({ children }: { children: ReactNode }) {
  const [colorSchemePreference, setColorSchemePreference] = useState<ColorSchemePreference>(
    readStoredColorSchemePreference,
  )
  const [contrastModePreference, setContrastModePreference] = useState<ContrastModePreference>(
    readStoredContrastModePreference,
  )
  const [systemColorScheme, setSystemColorScheme] = useState<ColorScheme>(getSystemColorScheme)
  const [systemContrastMode, setSystemContrastMode] = useState<ContrastMode>(getSystemContrastMode)

  // Keep the detected system values current so a "system" preference reacts
  // live if the user changes their OS/browser settings while the app is open.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQueryLists = [
      window.matchMedia('(prefers-color-scheme: dark)'),
      window.matchMedia('(forced-colors: active)'),
      window.matchMedia('(prefers-contrast: more)'),
      window.matchMedia('(prefers-reduced-transparency: reduce)'),
    ]

    const handleChange = () => {
      setSystemColorScheme(getSystemColorScheme())
      setSystemContrastMode(getSystemContrastMode())
    }

    mediaQueryLists.forEach((mql) => mql.addEventListener('change', handleChange))
    return () => {
      mediaQueryLists.forEach((mql) => mql.removeEventListener('change', handleChange))
    }
  }, [])

  const colorScheme = colorSchemePreference === 'system' ? systemColorScheme : colorSchemePreference
  const contrastMode = contrastModePreference === 'system' ? systemContrastMode : contrastModePreference

  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('pf-v6-theme-dark', colorScheme === 'dark')
    try {
      window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, colorSchemePreference)
    } catch {
      // Ignore storage failures (e.g. private browsing).
    }
  }, [colorScheme, colorSchemePreference])

  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.toggle('pf-v6-theme-glass', contrastMode === 'glass')
    root.classList.toggle('pf-v6-theme-high-contrast', contrastMode === 'high-contrast')
    try {
      window.localStorage.setItem(CONTRAST_MODE_STORAGE_KEY, contrastModePreference)
    } catch {
      // Ignore storage failures (e.g. private browsing).
    }
  }, [contrastMode, contrastModePreference])

  const value = useMemo(
    () => ({
      colorSchemePreference,
      setColorSchemePreference,
      contrastModePreference,
      setContrastModePreference,
    }),
    [colorSchemePreference, contrastModePreference],
  )

  return <ThemePreferencesContext.Provider value={value}>{children}</ThemePreferencesContext.Provider>
}

export function useThemePreferences(): ThemePreferencesContextValue {
  const context = useContext(ThemePreferencesContext)
  if (!context) {
    throw new Error('useThemePreferences must be used within a ThemePreferencesProvider')
  }
  return context
}
