export type ProviderAdminNavId =
  | 'overview'
  | 'catalog'
  | 'infrastructure-data-centers'
  | 'infrastructure-hardware-inventory'
  | 'infrastructure-compute-images'
  | 'infrastructure-bmaas-templates'
  | 'infrastructure-external-ip-pools'
  | 'administration-organizations'
  | 'administration-quotas'
  | 'administration-rbac'
  | 'billing-metering'
  | 'system'

export type ProviderAdminNavItem = {
  id: ProviderAdminNavId
  label: string
}

export const PROVIDER_ADMIN_NAV_ITEMS: ProviderAdminNavItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'catalog', label: 'Catalog' },
  { id: 'billing-metering', label: 'Billing & metering' },
  { id: 'system', label: 'System' },
]

export const PROVIDER_ADMIN_INFRASTRUCTURE_NAV_ITEMS: ProviderAdminNavItem[] = [
  { id: 'infrastructure-data-centers', label: 'Data centers' },
  { id: 'infrastructure-hardware-inventory', label: 'Hardware inventory' },
  { id: 'infrastructure-compute-images', label: 'Compute images' },
  { id: 'infrastructure-bmaas-templates', label: 'BMaaS templates' },
  { id: 'infrastructure-external-ip-pools', label: 'External IP pools' },
]

export const PROVIDER_ADMIN_ADMINISTRATION_NAV_ITEMS: ProviderAdminNavItem[] = [
  { id: 'administration-organizations', label: 'Organizations' },
  { id: 'administration-quotas', label: 'Quotas' },
  { id: 'administration-rbac', label: 'RBAC' },
]

export function isInfrastructureNavId(navId: string): boolean {
  return navId.startsWith('infrastructure-')
}

export function isAdministrationNavId(navId: string): boolean {
  return navId.startsWith('administration-')
}

export function isOrganizationsNavId(navId: string): boolean {
  return navId === 'administration-organizations'
}
