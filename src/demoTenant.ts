export type DemoTenantId = 'northsummit' | 'evergreen'

export const DEMO_TENANT_LABEL: Record<DemoTenantId, string> = {
  northsummit: 'north-summit-bank',
  evergreen: 'bluesolace-financial-group',
}

/** Pre-Kubernetes-convention organization display names — matched when migrating stored orgs. */
export const LEGACY_DEMO_TENANT_LABEL: Record<DemoTenantId, string> = {
  northsummit: 'North Summit Bank',
  evergreen: 'BlueSolace Financial Group',
}

export function isDemoTenantId(value: string): value is DemoTenantId {
  return value === 'northsummit' || value === 'evergreen'
}

export const DEMO_VERTEXA_PROVIDER_LOGIN_EMAIL = 'alex.johnson@vertexacloud.com'

export const DEMO_TENANT_LOGIN_EMAIL_USER: Record<DemoTenantId, string> = {
  northsummit: 'cmorgan@northsummitbank.com',
  evergreen: 'ecruz@bluesolacefinancial.com',
}

export const DEMO_TENANT_LOGIN_EMAIL_ADMIN: Record<DemoTenantId, string> = {
  northsummit: 'pnair@northsummitbank.com',
  evergreen: 'marcus.chen@bluesolacefinancial.com',
}

/** Signed-in display name for tenant admin console (masthead; demo). */
export const DEMO_TENANT_DISPLAY_ADMIN: Record<DemoTenantId, string> = {
  northsummit: 'Priya Nair',
  evergreen: 'Marcus Chen',
}

/** Signed-in display name for tenant user workspace (masthead; demo). */
export const DEMO_TENANT_DISPLAY_USER: Record<DemoTenantId, string> = {
  northsummit: 'Chris Morgan',
  evergreen: 'Emerson Cruz',
}

export const DEMO_LOGIN_PREFILLED_PASSWORD = '*****************'
