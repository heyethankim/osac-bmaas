import {
  emailMatchesOrganizationDomains,
  type OrganizationAssignedRoleId,
  type RegisteredOrganization,
} from '../providerAdmin/organizations'
import { updateProviderRegisteredOrganization } from '../providerSetup/storage'

export type TenantAdministrator = {
  name: string
  email: string
  isPrimary: boolean
  roleId: AssignableTenantRoleId
}

export const TENANT_ADMINISTRATORS_DEMO = {
  title: 'Administration',
  lede: 'Manage who has tenant admin access to catalog, networking, and projects for your tenant.',
  addAdministratorLabel: 'Add tenant administrator',
  roleLabel: 'Tenant administrator',
  emptyTitle: 'No administrators match your filters',
  emptyBody: 'Try a different role, status, or search term, or clear filters.',
  emptyOnlyPrimaryBody:
    'You are the only tenant administrator. Add colleagues who should help manage this tenant.',
} as const

export const ASSIGNABLE_TENANT_ROLES = [
  {
    id: 'tenant-administrator',
    label: 'Tenant administrator',
    description: 'Full administrative access to all resources within a tenant.',
    color: 'purple',
  },
  {
    id: 'tenant-reader',
    label: 'Tenant reader',
    description: 'Read-only access to all resources within a tenant.',
    color: 'blue',
  },
  {
    id: 'tenant-user',
    label: 'Tenant user',
    description: 'Standard user access within a tenant.',
    color: 'teal',
  },
] as const

export type AssignableTenantRoleId = OrganizationAssignedRoleId

export function getAssignableTenantRole(
  roleId: AssignableTenantRoleId,
): (typeof ASSIGNABLE_TENANT_ROLES)[number] {
  return (
    ASSIGNABLE_TENANT_ROLES.find((role) => role.id === roleId) ?? ASSIGNABLE_TENANT_ROLES[0]
  )
}

export type AdministratorRoleFilter = 'all' | AssignableTenantRoleId
export type AdministratorStatusFilter = 'all' | 'Pending' | 'Active'

export function buildAdministratorFilterParts(
  searchValue: string,
  selectedRole: AdministratorRoleFilter = 'all',
  selectedStatus: AdministratorStatusFilter = 'all',
): string[] {
  const parts: string[] = []

  if (selectedRole !== 'all') {
    parts.push(`role: ${getAssignableTenantRole(selectedRole).label}`)
  }

  if (selectedStatus !== 'all') {
    parts.push(`status: ${selectedStatus}`)
  }

  if (searchValue.trim()) {
    parts.push(`search: "${searchValue.trim()}"`)
  }

  return parts
}

export function hasPrimaryTenantAdministrator(
  organization: RegisteredOrganization,
): boolean {
  return Boolean(organization.tenantAdminEmail.trim())
}

function toRoleAssignment(
  admin: { name: string; email: string; roleId?: AssignableTenantRoleId },
  isPrimary: boolean,
): TenantAdministrator {
  return {
    name: admin.name,
    email: admin.email,
    isPrimary,
    roleId: admin.roleId ?? 'tenant-administrator',
  }
}

export function listRoleAssignments(
  organization: RegisteredOrganization,
): TenantAdministrator[] {
  const additional = organization.additionalTenantAdmins.map((admin) =>
    toRoleAssignment(admin, false),
  )

  if (!hasPrimaryTenantAdministrator(organization)) {
    return additional
  }

  return [
    toRoleAssignment(
      {
        name: organization.tenantAdminName,
        email: organization.tenantAdminEmail,
        roleId: 'tenant-administrator',
      },
      true,
    ),
    ...additional,
  ]
}

export function listTenantAdministrators(
  organization: RegisteredOrganization,
): TenantAdministrator[] {
  return listRoleAssignments(organization).filter(
    (assignment) => assignment.roleId === 'tenant-administrator',
  )
}

/** Workspace after OSAC login: administrators get the admin console; everyone else gets the user workspace. */
export function resolveTenantWorkspaceRoleForEmail(
  organization: RegisteredOrganization,
  email: string,
): 'tenant-admin' | 'tenant-user' {
  const normalized = email.trim().toLowerCase()
  const assignment = listRoleAssignments(organization).find(
    (admin) => admin.email.trim().toLowerCase() === normalized,
  )
  return assignment?.roleId === 'tenant-administrator' ? 'tenant-admin' : 'tenant-user'
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
  return listRoleAssignments(organization).some(
    (admin) => normalizeEmail(admin.email) === normalized,
  )
}

const DEMO_ASSIGN_ROLE_CANDIDATES = [
  { name: 'Riley Chen', localPart: 'rchen' },
  { name: 'Taylor Brooks', localPart: 'tbrooks' },
  { name: 'Jordan Wu', localPart: 'jwu' },
] as const

export function buildDemoAssignRoleForm(organization: RegisteredOrganization): {
  name: string
  email: string
  roleId: AssignableTenantRoleId
} {
  const domain = organization.primaryDomain
  const candidate =
    DEMO_ASSIGN_ROLE_CANDIDATES.find(
      (person) => !isTenantAdministratorEmailTaken(organization, `${person.localPart}@${domain}`),
    ) ?? DEMO_ASSIGN_ROLE_CANDIDATES[0]

  return {
    name: candidate.name,
    email: `${candidate.localPart}@${domain}`,
    roleId: 'tenant-administrator',
  }
}

export function assignTenantRole(
  organization: RegisteredOrganization,
  assignment: { name: string; email: string; roleId: AssignableTenantRoleId },
): RegisteredOrganization | null {
  if (assignment.roleId === 'tenant-administrator') {
    return assignTenantAdministrator(organization, assignment)
  }

  return addAdditionalTenantAdministrator(organization, assignment)
}

export function assignTenantAdministrator(
  organization: RegisteredOrganization,
  admin: { name: string; email: string },
): RegisteredOrganization | null {
  if (hasPrimaryTenantAdministrator(organization)) {
    return addAdditionalTenantAdministrator(organization, {
      ...admin,
      roleId: 'tenant-administrator',
    })
  }

  const name = admin.name.trim()
  const email = normalizeEmail(admin.email)

  if (!name || !email || isTenantAdministratorEmailTaken(organization, email)) {
    return null
  }

  if (!emailMatchesOrganizationDomain(email, organization)) {
    return null
  }

  return updateProviderRegisteredOrganization(organization.id, {
    tenantAdminName: name,
    tenantAdminEmail: email,
    rbacConfigured: true,
  })
}

export function addAdditionalTenantAdministrator(
  organization: RegisteredOrganization,
  admin: { name: string; email: string; roleId?: AssignableTenantRoleId },
): RegisteredOrganization | null {
  const name = admin.name.trim()
  const email = normalizeEmail(admin.email)
  const roleId = admin.roleId ?? 'tenant-administrator'

  if (!name || !email || isTenantAdministratorEmailTaken(organization, email)) {
    return null
  }

  if (!emailMatchesOrganizationDomain(email, organization)) {
    return null
  }

  return updateProviderRegisteredOrganization(organization.id, {
    additionalTenantAdmins: [
      ...organization.additionalTenantAdmins,
      {
        name,
        email,
        ...(roleId === 'tenant-administrator' ? {} : { roleId }),
      },
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

export function removeRoleAssignment(
  organization: RegisteredOrganization,
  email: string,
): RegisteredOrganization | null {
  const normalized = normalizeEmail(email)

  if (normalizeEmail(organization.tenantAdminEmail) === normalized) {
    return updateProviderRegisteredOrganization(organization.id, {
      tenantAdminName: '',
      tenantAdminEmail: '',
    })
  }

  return removeAdditionalTenantAdministrator(organization, email)
}
