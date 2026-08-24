import type { TenantNavItem } from '../tenantShell/constants'

export type IdpManagerNavId = 'identity-provider' | 'roles'

export const IDP_MANAGER_NAV_ITEMS: TenantNavItem[] = [
  { id: 'identity-provider', label: 'Identity provider' },
  { id: 'roles', label: 'Roles' },
]

export const IDP_MANAGER_IDENTITY_PROVIDER_COPY = {
  title: 'Identity providers',
  lede: 'Manage identity providers for this tenant.',
  emptyTitle: 'No identity providers yet',
  emptyBody: 'Add your first identity provider to get started.',
  connectFirstLabel: 'Connect first identity provider',
  addLabel: 'Add identity provider',
  filterEmptyTitle: 'No identity providers match your filters',
  filterEmptyBody: 'Try a different protocol, status, or search term, or clear filters.',
} as const

export const IDP_MANAGER_ROLES_COPY = {
  title: 'Roles',
  lede: 'Assign tenant administrator, reader, and user roles for this tenant.',
  addAdministratorLabel: 'Assign role',
  assignFirstLabel: 'Assign first role',
  wizardTitle: 'Assign roles',
  wizardSubmitLabel: 'Assign role',
  emptyTitle: 'No roles assigned',
  emptyBody: 'Assign a tenant administrator, reader, or user for this tenant.',
} as const

export function isIdpManagerNavId(value: string | null): value is IdpManagerNavId {
  return value === 'identity-provider' || value === 'roles'
}
