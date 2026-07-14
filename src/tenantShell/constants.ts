export type { TenantAdminNavGroup, TenantAdminNavItem } from '../tenantAdmin/constants'
export { TENANT_ADMIN_NAV_GROUPS, TENANT_ADMIN_NAV_ITEMS } from '../tenantAdmin/constants'

export type TenantNavItem = {
  id: string
  label: string
}

export type TenantNavGroup = {
  id: string
  label: string
  items: TenantNavItem[]
}

export const TENANT_USER_NAV_ITEMS: TenantNavItem[] = [
  { id: 'catalog', label: 'Catalog' },
  { id: 'my-instances', label: 'My instances' },
  { id: 'activity-log', label: 'Activity log' },
]
