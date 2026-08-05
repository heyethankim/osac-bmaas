export type TenantAdminNavId =
  | 'overview'
  | 'catalog'
  | 'services-baremetal'
  | 'services-clusters'
  | 'services-models'
  | 'services-virtual-machines'
  | 'projects-teams'
  | 'networking-virtual-networks'
  | 'networking-subnets'
  | 'networking-security-groups'
  | 'networking-external-ip-pools'

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

export const TENANT_ADMIN_SERVICES_NAV_ITEMS: ReadonlyArray<{
  id: TenantAdminNavId
  label: string
}> = [
  { id: 'services-baremetal', label: 'Bare metal' },
  { id: 'services-clusters', label: 'Clusters' },
  { id: 'services-models', label: 'Models' },
  { id: 'services-virtual-machines', label: 'Virtual machines' },
]

export const TENANT_ADMIN_NETWORKING_NAV_ITEMS: ReadonlyArray<{
  id: TenantAdminNavId
  label: string
}> = [
  { id: 'networking-virtual-networks', label: 'Virtual networks' },
  { id: 'networking-subnets', label: 'Subnets' },
  { id: 'networking-security-groups', label: 'Security groups' },
  { id: 'networking-external-ip-pools', label: 'External IP pools' },
]

export const TENANT_ADMIN_NAV_ITEMS: TenantAdminNavItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'catalog', label: 'Catalog' },
  {
    id: 'services',
    label: 'Services',
    children: TENANT_ADMIN_SERVICES_NAV_ITEMS,
  },
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

export function isServicesNavId(navId: string): boolean {
  return navId.startsWith('services-')
}

/** @deprecated Use TENANT_ADMIN_NAV_ITEMS for navigation. */
export const TENANT_ADMIN_NAV_GROUPS: TenantAdminNavGroup[] = [
  {
    id: 'main',
    label: '',
    items: TENANT_ADMIN_NAV_ITEMS,
  },
]
