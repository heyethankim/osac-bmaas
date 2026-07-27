import type { CatalogServiceId, PublishCatalogScope } from '../providerSetup/templateDemo'
import type { RegisteredOrganization } from '../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../providerSetup/storage'
import { getProviderCatalogItems } from '../providerSetup/storage'
import type { CatalogNetworkPolicy } from '../providerAdmin/catalogNetworkPolicy'
import { resolveHardwareSpecsForCatalogItem } from '../catalog/hardwareSpecs'
import { resolveCatalogNetworkPolicyForOrganization } from './networking'

export type TenantCatalogGovernanceItem = {
  id: string
  serviceId: CatalogServiceId
  service: string
  status: string
  displayName: string
  categoryLabel: string
  cpu: string
  ram: string
  gpu: string
  osImage: string
  restricted: boolean
  approved: boolean
  scope: PublishCatalogScope
}

export type TenantCatalogGovernanceItemWithNetworking = TenantCatalogGovernanceItem & {
  catalogItemId?: string
  networkPolicy: CatalogNetworkPolicy
}

export const TENANT_CATALOG_MANAGER_DEMO = {
  title: 'Catalog',
  lede: "Filter the provider's global catalog down to safe, approved offerings.",
  accessLabel: 'Access',
  accessDetailNote:
    'Available to all organization members by default. Assign projects or teams if you want to restrict who can launch this item.',
  addProjectsLinkLabel: 'Set up projects & teams',
  manageProjectsLinkLabel: 'Manage projects & teams',
  drawerAccessLede:
    'Review provider-configured hardware and networking for this offering.',
  networkingLabel: 'Networking',
  networkingNotConfiguredSummary: 'Not configured',
  networkingViewDetailsLabel: 'Details',
  networkingNotConfiguredTableLabel: 'Not configured',
  networkingSectionLede:
    'Provider-locked fields cannot be changed. For editable fields, choose a value and optionally lock it for tenant users at launch.',
} as const

export function getTenantCatalogProjectsLinkLabel(projectCount: number): string {
  return projectCount > 0
    ? TENANT_CATALOG_MANAGER_DEMO.manageProjectsLinkLabel
    : TENANT_CATALOG_MANAGER_DEMO.addProjectsLinkLabel
}
export const TENANT_CATALOG_GOVERNANCE_ITEMS: TenantCatalogGovernanceItem[] = [
  {
    id: 'compute-r750',
    serviceId: 'baremetal',
    service: 'Bare Metal',
    status: 'Live',
    displayName: 'Bare Metal - GPU Training Server',
    categoryLabel: 'Compute · Standard',
    cpu: 'Intel Xeon Gold 6338 × 2',
    ram: '512 GB DDR4-3200',
    gpu: 'CPU-only',
    osImage: 'Red Hat Enterprise Linux 9.4',
    restricted: false,
    approved: true,
    scope: 'global-public',
  },
]

export function getTenantCatalogGovernanceItems(
  organization: RegisteredOrganization,
  catalogDraft: ProviderCatalogDraft | null,
): TenantCatalogGovernanceItemWithNetworking[] {
  const networkPolicy = resolveCatalogNetworkPolicyForOrganization(organization, catalogDraft)
  const linkedCatalog =
    (organization.catalogItemId
      ? getProviderCatalogItems().find((item) => item.catalogItemId === organization.catalogItemId)
      : null) ?? catalogDraft

  return TENANT_CATALOG_GOVERNANCE_ITEMS.map((item) => {
    const specs = linkedCatalog
      ? resolveHardwareSpecsForCatalogItem(linkedCatalog)
      : {
          cpu: item.cpu,
          ram: item.ram,
          gpu: item.gpu,
          osImage: item.osImage,
          categoryLabel: item.categoryLabel,
        }

    return {
      ...item,
      displayName: linkedCatalog?.displayName ?? item.displayName,
      status: linkedCatalog?.status === 'unpublished' ? 'Unpublished' : item.status,
      categoryLabel: specs.categoryLabel,
      cpu: specs.cpu,
      ram: specs.ram,
      gpu: specs.gpu,
      osImage: specs.osImage,
      scope:
        linkedCatalog?.scope ??
        (item.restricted ? 'vip-enterprise' : 'global-public'),
      catalogItemId: linkedCatalog?.catalogItemId,
      networkPolicy,
    }
  })
}

export function getTenantCatalogGovernanceSpecSummary(item: TenantCatalogGovernanceItem): string {
  return [item.cpu, item.ram, item.gpu, item.osImage].join(' · ')
}
