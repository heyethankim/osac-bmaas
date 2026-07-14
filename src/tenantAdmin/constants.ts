export type TenantAdminNavId =
  | 'overview'
  | 'catalog-manager'
  | 'projects-teams'
  | 'ip-pools'
  | 'billing'
  | 'instances'
  | 'settings'

export type TenantAdminNavItem = {
  id: TenantAdminNavId
  label: string
}

export type TenantAdminNavGroup = {
  id: string
  label: string
  items: TenantAdminNavItem[]
}

export const TENANT_ADMIN_NAV_ITEMS: TenantAdminNavItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'catalog-manager', label: 'Catalog manager' },
  { id: 'projects-teams', label: 'Projects & teams' },
  { id: 'ip-pools', label: 'IP pools' },
  { id: 'billing', label: 'Billing' },
]

/** @deprecated Use TENANT_ADMIN_NAV_ITEMS for flat navigation. */
export const TENANT_ADMIN_NAV_GROUPS: TenantAdminNavGroup[] = [
  {
    id: 'main',
    label: '',
    items: TENANT_ADMIN_NAV_ITEMS,
  },
]

export const TENANT_ACCEPT_INVITATION_INTRO = {
  title: 'Accept your organization invitation',
  lede: 'Your provider administrator registered this organization and invited you as the first tenant admin.',
} as const
