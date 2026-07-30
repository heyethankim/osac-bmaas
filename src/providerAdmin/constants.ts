export type ProviderAdminNavId =
  | 'overview'
  | 'catalog'
  | 'services-baremetal'
  | 'services-clusters'
  | 'services-models'
  | 'services-virtual-machines'
  | 'networking-virtual-networks'
  | 'networking-subnets'
  | 'networking-security-groups'
  | 'infrastructure-data-centers'
  | 'infrastructure-hardware-inventory'
  | 'infrastructure-compute-images'
  | 'infrastructure-bmaas-templates'
  | 'infrastructure-external-ip-pools'
  | 'administration-organizations'
  | 'administration-quotas'
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
]

export const PROVIDER_ADMIN_SERVICES_NAV_ITEMS: ProviderAdminNavItem[] = [
  { id: 'services-baremetal', label: 'Bare metal' },
  { id: 'services-clusters', label: 'Clusters' },
  { id: 'services-models', label: 'Models' },
  { id: 'services-virtual-machines', label: 'Virtual machines' },
]

export const PROVIDER_ADMIN_NETWORKING_NAV_ITEMS: ProviderAdminNavItem[] = [
  { id: 'networking-virtual-networks', label: 'Virtual networks' },
  { id: 'networking-subnets', label: 'Subnets' },
  { id: 'networking-security-groups', label: 'Security groups' },
]

export const PROVIDER_ADMIN_INFRASTRUCTURE_NAV_ITEMS: ProviderAdminNavItem[] = [
  { id: 'infrastructure-data-centers', label: 'Data centers' },
  { id: 'infrastructure-hardware-inventory', label: 'Hardware inventory' },
  { id: 'infrastructure-bmaas-templates', label: 'Profiles & templates' },
  { id: 'infrastructure-compute-images', label: 'Compute images' },
  { id: 'infrastructure-external-ip-pools', label: 'External IP pools' },
]

export const PROVIDER_ADMIN_ADMINISTRATION_NAV_ITEMS: ProviderAdminNavItem[] = [
  { id: 'administration-organizations', label: 'Organizations' },
  { id: 'administration-quotas', label: 'Quotas' },
]

export function isServicesNavId(navId: string): boolean {
  return navId.startsWith('services-')
}

export function isNetworkingNavId(navId: string): boolean {
  return navId.startsWith('networking-')
}

export function isInfrastructureNavId(navId: string): boolean {
  return navId.startsWith('infrastructure-')
}

export function isAdministrationNavId(navId: string): boolean {
  return navId.startsWith('administration-')
}

export function isOrganizationsNavId(navId: string): boolean {
  return navId === 'administration-organizations'
}
