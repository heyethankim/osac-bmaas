import {
  emailMatchesOrganizationDomains,
  type RegisteredOrganization,
} from '../providerAdmin/organizations'
import { updateProviderRegisteredOrganization } from '../providerSetup/storage'

export type TenantAdministrator = {
  name: string
  email: string
  isPrimary: boolean
}

export type AdministratorRoleFilter = 'all' | 'primary' | 'additional'

export const TENANT_ADMINISTRATORS_DEMO = {
  title: 'Administration',
  lede: 'Manage who has tenant admin access to catalog, networking, and projects for your organization.',
  addAdministratorLabel: 'Add tenant administrator',
  primaryRoleLabel: 'Primary administrator',
  additionalRoleLabel: 'Tenant administrator',
  emptyTitle: 'No administrators match your filters',
  emptyBody: 'Try a different role or search term, or clear filters.',
  emptyOnlyPrimaryBody:
    'You are the only tenant administrator. Add colleagues who should help manage this organization.',
} as const

export function listTenantAdministrators(
  organization: RegisteredOrganization,
): TenantAdministrator[] {
  return [
    {
      name: organization.tenantAdminName,
      email: organization.tenantAdminEmail,
      isPrimary: true,
    },
    ...organization.additionalTenantAdmins.map((admin) => ({
      name: admin.name,
      email: admin.email,
      isPrimary: false,
    })),
  ]
}

export function buildAdministratorFilterParts(
  searchValue: string,
  selectedRole: AdministratorRoleFilter,
): string[] {
  const parts: string[] = []

  if (selectedRole === 'primary') {
    parts.push(`role: ${TENANT_ADMINISTRATORS_DEMO.primaryRoleLabel}`)
  } else if (selectedRole === 'additional') {
    parts.push(`role: ${TENANT_ADMINISTRATORS_DEMO.additionalRoleLabel}`)
  }

  if (searchValue.trim()) {
    parts.push(`search: "${searchValue.trim()}"`)
  }

  return parts
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function emailMatchesOrganizationDomain(
  email: string,
  organization: RegisteredOrganization,
): boolean {
  return emailMatchesOrganizationDomains(email, organization)
}

export function isTenantAdministratorEmailTaken(
  organization: RegisteredOrganization,
  email: string,
): boolean {
  const normalized = normalizeEmail(email)
  return listTenantAdministrators(organization).some(
    (admin) => normalizeEmail(admin.email) === normalized,
  )
}

export function addAdditionalTenantAdministrator(
  organization: RegisteredOrganization,
  admin: { name: string; email: string },
): RegisteredOrganization | null {
  const name = admin.name.trim()
  const email = normalizeEmail(admin.email)

  if (!name || !email || isTenantAdministratorEmailTaken(organization, email)) {
    return null
  }

  if (!emailMatchesOrganizationDomain(email, organization)) {
    return null
  }

  return updateProviderRegisteredOrganization(organization.id, {
    additionalTenantAdmins: [
      ...organization.additionalTenantAdmins,
      { name, email },
    ],
    rbacConfigured: true,
  })
}

export function removeAdditionalTenantAdministrator(
  organization: RegisteredOrganization,
  email: string,
): RegisteredOrganization | null {
  const normalized = normalizeEmail(email)
  const nextAdmins = organization.additionalTenantAdmins.filter(
    (admin) => normalizeEmail(admin.email) !== normalized,
  )

  if (nextAdmins.length === organization.additionalTenantAdmins.length) {
    return null
  }

  return updateProviderRegisteredOrganization(organization.id, {
    additionalTenantAdmins: nextAdmins,
  })
}
