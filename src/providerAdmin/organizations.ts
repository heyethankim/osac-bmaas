import {
  DEMO_TENANT_DISPLAY_ADMIN,
  DEMO_TENANT_LOGIN_EMAIL_ADMIN,
  DEMO_TENANT_LABEL,
} from '../demoTenant'

export type RegisteredOrganization = {
  id: string
  name: string
  tenantId: string
  slug: string
  /** Primary email domain used for IdP association and RBAC tenancy. */
  primaryDomain: string
  billingAccountId: string
  billingAccountName: string
  catalogItemId: string | null
  catalogDisplayName: string | null
  externalIpPoolId: string | null
  externalIpPoolName: string | null
  externalIpPoolCidr: string | null
  maxInstances: number
  /** Kept for demo activation flows; assigned later via Roles in production. */
  tenantAdminName: string
  tenantAdminEmail: string
  /** Optional second tenant admin from Define roles (day-0 supports up to two). */
  additionalTenantAdmins: Array<{ name: string; email: string }>
  /** Optional day-0 tenant user invites; bulk CSV stays out of this modal. */
  invitedTenantUserEmails: string[]
  /** Org-scoped IdP connected after registration. */
  identityProviderConnected: boolean
  identityProviderName: string | null
  identityProviderDisplayName: string | null
  identityProviderProtocol: 'OIDC' | 'SAML' | null
  identityProviderIssuerUrl: string | null
  identityProviderClientId: string | null
  /** Org-scoped roles + first tenant admin assigned after registration. */
  rbacConfigured: boolean
  status: 'Pending activation' | 'Active'
  createdAt: string
}

export type OrganizationSetupNextAction = 'idp' | 'rbac'

/** Under-Status line: next incomplete step, or ready-for-login when setup is complete. */
export function getOrganizationSetupSignal(organization: RegisteredOrganization): string | null {
  if (organization.status === 'Active') {
    return null
  }

  if (!organization.identityProviderConnected) {
    return 'Needs identity provider'
  }

  if (!organization.rbacConfigured) {
    return 'Needs roles'
  }

  return 'Ready for login'
}

export function isOrganizationReadyForLogin(organization: RegisteredOrganization): boolean {
  return (
    organization.status === 'Pending activation' &&
    organization.identityProviderConnected &&
    organization.rbacConfigured
  )
}

/** Single next kebab / Status-link action while setup is incomplete. */
export function getOrganizationSetupNextAction(
  organization: RegisteredOrganization,
): OrganizationSetupNextAction | null {
  if (organization.status === 'Active') {
    return null
  }

  if (!organization.identityProviderConnected) {
    return 'idp'
  }

  if (!organization.rbacConfigured) {
    return 'rbac'
  }

  return null
}

export const ORGANIZATION_SETUP_NEXT_ACTION_LABEL: Record<OrganizationSetupNextAction, string> = {
  idp: 'Connect identity provider',
  rbac: 'Define roles',
}

export type OrganizationActivationStepId = 'registered' | 'idp' | 'rbac' | 'ready'

export type OrganizationActivationStep = {
  id: OrganizationActivationStepId
  label: string
  complete: boolean
}

/** Compact activation progress for the organization details drawer. */
export function getOrganizationActivationSteps(
  organization: RegisteredOrganization,
): OrganizationActivationStep[] {
  const idpComplete = organization.identityProviderConnected
  const rbacComplete = organization.rbacConfigured
  const readyComplete = organization.status === 'Active' || (idpComplete && rbacComplete)

  return [
    {
      id: 'registered',
      label: 'Organization registered',
      complete: true,
    },
    {
      id: 'idp',
      label: 'Identity provider connected',
      complete: idpComplete,
    },
    {
      id: 'rbac',
      label: 'Roles defined',
      complete: rbacComplete,
    },
    {
      id: 'ready',
      label: 'Ready for tenant login',
      complete: readyComplete,
    },
  ]
}

export function buildDemoIdentityProviderName(
  protocol: 'OIDC' | 'SAML',
  primaryDomain: string,
): string {
  const domain = primaryDomain.trim() || 'organization'
  return `${protocol} · ${domain}`
}

export const REGISTER_ORGANIZATION_STEPS = [
  { id: 'organization', label: 'Organization' },
  { id: 'review', label: 'Review' },
] as const

export type RegisterOrganizationStepId = (typeof REGISTER_ORGANIZATION_STEPS)[number]['id']

export type RegisterOrganizationForm = {
  organizationName: string
  primaryDomain: string
  billingAccountId: string
  billingAccountName: string
  externalIpPoolId: string
  maxInstances: string
}

export const DEFAULT_REGISTER_ORGANIZATION_FORM: RegisterOrganizationForm = {
  organizationName: DEMO_TENANT_LABEL.northstar,
  primaryDomain: 'northsummitbank.com',
  billingAccountId: '',
  billingAccountName: 'North Summit Bank — Enterprise Billing',
  externalIpPoolId: 'eipool-northstar-edge',
  maxInstances: '20',
}

/** Demo presets cycled so the wizard never prefill a name/domain already registered. */
const REGISTER_ORGANIZATION_DEMO_PRESETS: Array<{
  organizationName: string
  primaryDomain: string
  billingAccountName: string
}> = [
  {
    organizationName: DEMO_TENANT_LABEL.northstar,
    primaryDomain: 'northsummitbank.com',
    billingAccountName: 'North Summit Bank — Enterprise Billing',
  },
  {
    organizationName: DEMO_TENANT_LABEL.evergreen,
    primaryDomain: 'bluesolacefinancial.com',
    billingAccountName: 'BlueSolace Financial Group — Enterprise Billing',
  },
  {
    organizationName: 'Harborline Capital',
    primaryDomain: 'harborlinecapital.com',
    billingAccountName: 'Harborline Capital — Enterprise Billing',
  },
  {
    organizationName: 'Silverpine Trust',
    primaryDomain: 'silverpinetrust.com',
    billingAccountName: 'Silverpine Trust — Enterprise Billing',
  },
  {
    organizationName: 'Redwood Mutual',
    primaryDomain: 'redwoodmutual.com',
    billingAccountName: 'Redwood Mutual — Enterprise Billing',
  },
]

/** Demo placeholders until Roles assigns the first tenant admin. */
export const DEFAULT_REGISTER_ORGANIZATION_TENANT_ADMIN = {
  name: DEMO_TENANT_DISPLAY_ADMIN.northstar,
  email: DEMO_TENANT_LOGIN_EMAIL_ADMIN.northstar,
} as const

export function generateOrganizationId(): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `org_${suffix}`
}

export function generateTenantId(): string {
  const suffix = Math.random().toString(36).slice(2, 6)
  return `tenant-${suffix}`
}

/** System-assigned billing account id shown read-only during registration. */
export function generateBillingAccountId(): string {
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  const sequence = String(Math.floor(Math.random() * 9000) + 1000)
  return `ACCT-${suffix}-${sequence}`
}

/** Normalize user input to a bare hostname (no scheme, path, or leading @). */
export function normalizePrimaryDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
}

export function isValidPrimaryDomain(value: string): boolean {
  const domain = normalizePrimaryDomain(value)
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(
    domain,
  )
}

export function slugifyOrganizationName(name: string): string {
  const normalized = name.trim().toLowerCase()

  if (normalized === 'north summit bank') {
    return 'northstar'
  }

  if (normalized === 'bluesolace financial group' || normalized === 'blue solace financial group') {
    return 'evergreen'
  }

  return normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function getTakenOrganizationKeys(existingOrganizations: RegisteredOrganization[]) {
  return {
    names: new Set(
      existingOrganizations.map((organization) => organization.name.trim().toLowerCase()),
    ),
    domains: new Set(
      existingOrganizations.map((organization) =>
        normalizePrimaryDomain(organization.primaryDomain),
      ),
    ),
    slugs: new Set(existingOrganizations.map((organization) => organization.slug)),
  }
}

export function isOrganizationNameTaken(
  organizationName: string,
  existingOrganizations: RegisteredOrganization[],
): boolean {
  const name = organizationName.trim().toLowerCase()
  if (!name) {
    return false
  }

  return getTakenOrganizationKeys(existingOrganizations).names.has(name)
}

export function isOrganizationDomainTaken(
  primaryDomain: string,
  existingOrganizations: RegisteredOrganization[],
): boolean {
  const domain = normalizePrimaryDomain(primaryDomain)
  if (!domain) {
    return false
  }

  return getTakenOrganizationKeys(existingOrganizations).domains.has(domain)
}

export function isOrganizationSlugTaken(
  organizationName: string,
  existingOrganizations: RegisteredOrganization[],
): boolean {
  const slug = slugifyOrganizationName(organizationName)
  if (!slug) {
    return false
  }

  return getTakenOrganizationKeys(existingOrganizations).slugs.has(slug)
}

/** Prefill the next unused demo org so the same organization cannot be registered twice. */
export function buildNextRegisterOrganizationForm(
  existingOrganizations: RegisteredOrganization[],
): RegisterOrganizationForm {
  const taken = getTakenOrganizationKeys(existingOrganizations)

  for (const preset of REGISTER_ORGANIZATION_DEMO_PRESETS) {
    const slug = slugifyOrganizationName(preset.organizationName)
    const domain = normalizePrimaryDomain(preset.primaryDomain)
    if (
      taken.names.has(preset.organizationName.trim().toLowerCase()) ||
      taken.domains.has(domain) ||
      taken.slugs.has(slug)
    ) {
      continue
    }

    return {
      ...DEFAULT_REGISTER_ORGANIZATION_FORM,
      organizationName: preset.organizationName,
      primaryDomain: preset.primaryDomain,
      billingAccountName: preset.billingAccountName,
      billingAccountId: generateBillingAccountId(),
    }
  }

  let suffix = existingOrganizations.length + 1
  while (suffix < existingOrganizations.length + 100) {
    const organizationName = `Vertexa Tenant ${suffix}`
    const primaryDomain = `tenant${suffix}.example.com`
    const slug = slugifyOrganizationName(organizationName)
    if (
      !taken.names.has(organizationName.toLowerCase()) &&
      !taken.domains.has(primaryDomain) &&
      !taken.slugs.has(slug)
    ) {
      return {
        ...DEFAULT_REGISTER_ORGANIZATION_FORM,
        organizationName,
        primaryDomain,
        billingAccountName: `${organizationName} — Enterprise Billing`,
        billingAccountId: generateBillingAccountId(),
      }
    }
    suffix += 1
  }

  const unique = Math.random().toString(36).slice(2, 6)
  return {
    ...DEFAULT_REGISTER_ORGANIZATION_FORM,
    organizationName: `Vertexa Tenant ${unique}`,
    primaryDomain: `tenant-${unique}.example.com`,
    billingAccountName: `Vertexa Tenant ${unique} — Enterprise Billing`,
    billingAccountId: generateBillingAccountId(),
  }
}

export const PROVIDER_ORGANIZATIONS_DEMO = {
  lede: 'Register tenant organizations and map billing accounts.',
  emptyTitle: 'No organizations yet',
  emptyBody: 'Register your first organization to map billing and get started.',
  registerFirstOrganizationLabel: 'Register first organization',
  registerOrganizationLabel: 'Register organization',
} as const
