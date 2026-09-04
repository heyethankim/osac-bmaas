import { TENANT_ADMIN_NETWORKING_NAV_ITEMS } from '../tenantAdmin/constants'

export type { TenantAdminNavGroup, TenantAdminNavItem } from '../tenantAdmin/constants'
export {
  TENANT_ADMIN_NAV_GROUPS,
  TENANT_ADMIN_NAV_ITEMS,
  TENANT_ADMIN_NETWORKING_NAV_ITEMS,
} from '../tenantAdmin/constants'

export type TenantNavItem = {
  id: string
  label: string
  children?: ReadonlyArray<{ id: string; label: string }>
}

export type TenantNavGroup = {
  id: string
  label: string
  items: TenantNavItem[]
}

export function flattenTenantNavItems(
  items: readonly TenantNavItem[],
): Array<{ id: string; label: string }> {
  return items.flatMap((item) =>
    item.children?.length ? [...item.children] : [{ id: item.id, label: item.label }],
  )
}

export const TENANT_USER_SERVICES_NAV_ITEMS: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'services-baremetal', label: 'Bare metal' },
  { id: 'services-clusters', label: 'Clusters' },
  { id: 'services-models', label: 'Models' },
  { id: 'services-virtual-machines', label: 'Virtual machines' },
]

export const TENANT_USER_NAV_ITEMS: TenantNavItem[] = [
  { id: 'catalog', label: 'Catalog' },
  {
    id: 'services',
    label: 'Services',
    children: TENANT_USER_SERVICES_NAV_ITEMS,
  },
  { id: 'projects-teams', label: 'Projects' },
  {
    id: 'networking',
    label: 'Networking',
    children: TENANT_ADMIN_NETWORKING_NAV_ITEMS,
  },
  { id: 'secrets', label: 'Secrets' },
  { id: 'activity-log', label: 'Activity log' },
]
