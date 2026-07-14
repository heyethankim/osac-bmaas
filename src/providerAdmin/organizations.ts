export type RegisteredOrganization = {
  id: string
  name: string
  tenantId: string
  slug: string
  billingAccountId: string
  billingAccountName: string
  catalogItemId: string | null
  catalogDisplayName: string | null
  externalIpPoolId: string | null
  externalIpPoolName: string | null
  externalIpPoolCidr: string | null
  maxInstances: number
  tenantAdminName: string
  tenantAdminEmail: string
  status: 'Pending activation' | 'Active'
  createdAt: string
}

export const REGISTER_ORGANIZATION_STEPS = [
  { id: 'organization', label: 'Organization' },
  { id: 'access', label: 'Catalog, quota & network' },
  { id: 'tenant-admin', label: 'Tenant admin' },
  { id: 'review', label: 'Review' },
] as const

export type RegisterOrganizationStepId = (typeof REGISTER_ORGANIZATION_STEPS)[number]['id']

export type RegisterOrganizationForm = {
  organizationName: string
  billingAccountId: string
  billingAccountName: string
  externalIpPoolId: string
  maxInstances: string
  tenantAdminName: string
  tenantAdminEmail: string
}

import {
  DEMO_TENANT_DISPLAY_ADMIN,
  DEMO_TENANT_LOGIN_EMAIL_ADMIN,
  DEMO_TENANT_LABEL,
} from '../demoTenant'

export const DEFAULT_REGISTER_ORGANIZATION_FORM: RegisterOrganizationForm = {
  organizationName: DEMO_TENANT_LABEL.northstar,
  billingAccountId: 'ACCT-NSB-0042',
  billingAccountName: 'North Summit Bank — Enterprise Billing',
  externalIpPoolId: 'eipool-northstar-edge',
  maxInstances: '20',
  tenantAdminName: DEMO_TENANT_DISPLAY_ADMIN.northstar,
  tenantAdminEmail: DEMO_TENANT_LOGIN_EMAIL_ADMIN.northstar,
}

export function generateOrganizationId(): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `org_${suffix}`
}

export function generateTenantId(): string {
  const suffix = Math.random().toString(36).slice(2, 6)
  return `tenant-${suffix}`
}

export function slugifyOrganizationName(name: string): string {
  const normalized = name.trim().toLowerCase()

  if (normalized === 'north summit bank') {
    return 'northstar'
  }

  return normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export const PROVIDER_ORGANIZATIONS_DEMO = {
  lede: 'Register tenant organizations, map billing accounts, assign catalog access, and invite the first tenant admin.',
  emptyTitle: 'No organizations yet',
  emptyBody: 'Register your first organization to map billing, assign catalog access, and invite a tenant admin.',
  registerFirstOrganizationLabel: 'Register first organization',
  registerOrganizationLabel: 'Register organization',
} as const
