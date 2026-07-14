import type { TenantProject } from './projects'

export type TenantCatalogGovernanceItem = {
  id: string
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
}

export const TENANT_CATALOG_MANAGER_DEMO = {
  title: 'Catalog manager',
  lede:
    "Filter the provider's global catalog down to safe, approved offerings. Scope GPU-intensive items to authorized teams only.",
  addProjectTeamsLinkLabel: 'Add project & teams',
  authorizedTeamsLabel: 'Authorized teams',
  authorizedTeamsEmpty: 'No teams authorized yet.',
  approvedLabel: 'Approved',
} as const

export const TENANT_CATALOG_GOVERNANCE_ITEMS: TenantCatalogGovernanceItem[] = [
  {
    id: 'compute-r750',
    service: 'BMaaS',
    status: 'Live',
    displayName: 'Compute Node · Dell PowerEdge R750 3x · 512 GB DDR4-3200',
    categoryLabel: 'Compute · Standard',
    cpu: 'Intel Xeon Gold 6338 × 2',
    ram: '512 GB DDR4',
    gpu: 'CPU-only',
    osImage: 'RHEL 9.4',
    restricted: false,
    approved: true,
  },
]

export function getTenantCatalogGovernanceSpecSummary(item: TenantCatalogGovernanceItem): string {
  return [item.cpu, item.ram, item.gpu, item.osImage].join(' · ')
}

export function getTenantCatalogAuthorizedTeams(projects: TenantProject[]): string[] {
  return [...projects]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((project) => project.name)
}
