export type ProviderAdminNavId =
  | 'overview'
  | 'catalog'
  | 'services-baremetal'
  | 'services-clusters'
  | 'services-models'
  | 'services-virtual-machines'
  | 'projects-teams'
  | 'networking'
  | 'networking-virtual-networks'
  | 'networking-subnets'
  | 'networking-security-groups'
  | 'networking-external-ip-pools'
  | 'secrets'
  | 'infrastructure-data-centers'
  | 'infrastructure-hardware-inventory'
  | 'infrastructure-bmaas-templates'
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
]

export const PROVIDER_ADMIN_SERVICES_NAV_ITEMS: ProviderAdminNavItem[] = [
  { id: 'services-baremetal', label: 'Bare metal' },
  { id: 'services-clusters', label: 'Clusters' },
  { id: 'services-models', label: 'Models' },
  { id: 'services-virtual-machines', label: 'Virtual machines' },
]

export const PROVIDER_ADMIN_NETWORKING_NAV_ID: ProviderAdminNavId = 'networking'
export const PROVIDER_ADMIN_NETWORKING_NAV_LABEL = 'External IP pools'

export const PROVIDER_ADMIN_INFRASTRUCTURE_NAV_ITEMS: ProviderAdminNavItem[] = [
  { id: 'infrastructure-data-centers', label: 'Data centers' },
  { id: 'infrastructure-hardware-inventory', label: 'Hardware inventory' },
  { id: 'infrastructure-bmaas-templates', label: 'Profiles & templates' },
]

export const PROVIDER_ADMIN_ADMINISTRATION_NAV_ITEMS: ProviderAdminNavItem[] = [
  { id: 'administration-organizations', label: 'Tenants' },
  { id: 'administration-quotas', label: 'Quotas' },
  { id: 'billing-metering', label: 'Billing & metering' },
]

export function isServicesNavId(navId: string): boolean {
  return navId.startsWith('services-')
}

export function isNetworkingNavId(navId: string): boolean {
  return navId === PROVIDER_ADMIN_NETWORKING_NAV_ID || navId.startsWith('networking-')
}

export function isInfrastructureNavId(navId: string): boolean {
  return navId.startsWith('infrastructure-')
}

export function isAdministrationNavId(navId: string): boolean {
  return navId.startsWith('administration-') || navId === 'billing-metering'
}

export function isOrganizationsNavId(navId: string): boolean {
  return navId === 'administration-organizations'
}

/** Provider admin no longer exposes tenant workspace sections in the shell. */
export function resolveProviderAdminNavId(navId: ProviderAdminNavId): ProviderAdminNavId {
  if (isServicesNavId(navId) || navId === 'projects-teams') {
    return 'catalog'
  }

  if (isNetworkingNavId(navId)) {
    return PROVIDER_ADMIN_NETWORKING_NAV_ID
  }

  return navId
}
