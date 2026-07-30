export type TenantAdminNavId =
  | 'overview'
  | 'catalog'
  | 'services'
  | 'projects-teams'
  | 'networking-virtual-networks'
  | 'networking-subnets'
  | 'networking-security-groups'

export type TenantAdminNavItem = {
  id: string
  label: string
  children?: ReadonlyArray<{ id: TenantAdminNavId; label: string }>
}

export type TenantAdminNavGroup = {
  id: string
  label: string
  items: TenantAdminNavItem[]
}

export const TENANT_ADMIN_NETWORKING_NAV_ITEMS: ReadonlyArray<{
  id: TenantAdminNavId
  label: string
}> = [
  { id: 'networking-virtual-networks', label: 'Virtual networks' },
  { id: 'networking-subnets', label: 'Subnets' },
  { id: 'networking-security-groups', label: 'Security groups' },
]

export const TENANT_ADMIN_NAV_ITEMS: TenantAdminNavItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'projects-teams', label: 'Projects & teams' },
  {
    id: 'networking',
    label: 'Networking',
    children: TENANT_ADMIN_NETWORKING_NAV_ITEMS,
  },
]

export function getTenantAdminLeafNavItems(
  items: readonly TenantAdminNavItem[] = TENANT_ADMIN_NAV_ITEMS,
): Array<{ id: TenantAdminNavId; label: string }> {
  return items.flatMap((item) =>
    item.children?.length
      ? [...item.children]
      : [{ id: item.id as TenantAdminNavId, label: item.label }],
  )
}

export function isNetworkingNavId(navId: string): boolean {
  return navId.startsWith('networking-')
}

/** @deprecated Use TENANT_ADMIN_NAV_ITEMS for navigation. */
export const TENANT_ADMIN_NAV_GROUPS: TenantAdminNavGroup[] = [
  {
    id: 'main',
    label: '',
    items: TENANT_ADMIN_NAV_ITEMS,
  },
]
