import type { TenantProjectCatalogItem } from './projects'

export type CreateProjectWizardStepId =
  | 'project-info'
  | 'quotas-ip-pool'
  | 'catalog'
  | 'team-members'

export type TenantProjectEnvironment = 'development' | 'staging' | 'production' | 'research'

export type TenantProjectMemberRole = 'developer' | 'project-admin' | 'viewer'

export type TenantProjectWizardMember = {
  id: string
  name: string
  email: string
  role: TenantProjectMemberRole
}

export const CREATE_PROJECT_WIZARD_STEPS: ReadonlyArray<{
  id: CreateProjectWizardStepId
  label: string
  description: string
}> = [
  {
    id: 'project-info',
    label: 'Project Info',
    description: '',
  },
  {
    id: 'quotas-ip-pool',
    label: 'Quotas & IP Pool',
    description: '',
  },
  {
    id: 'catalog',
    label: 'Catalog',
    description: '',
  },
  {
    id: 'team-members',
    label: 'Team Members',
    description: '',
  },
]

export const TENANT_PROJECT_ENVIRONMENTS: ReadonlyArray<{
  id: TenantProjectEnvironment
  label: string
}> = [
  { id: 'development', label: 'Development' },
  { id: 'staging', label: 'Staging' },
  { id: 'production', label: 'Production' },
  { id: 'research', label: 'Research' },
]

export const TENANT_PROJECT_MEMBER_ROLES: ReadonlyArray<{
  id: TenantProjectMemberRole
  label: string
  shortLabel: string
}> = [
  { id: 'developer', label: 'Developer — Provision and manage instances', shortLabel: 'Developer' },
  {
    id: 'project-admin',
    label: 'Project admin — Manage project settings and members',
    shortLabel: 'Project admin',
  },
  { id: 'viewer', label: 'Viewer — Read-only access', shortLabel: 'Viewer' },
]

export const CREATE_PROJECT_WIZARD_DEMO = {
  projectNamePlaceholder: 'e.g. Machine Learning Dev Team',
  descriptionPlaceholder: "Optional — describe this project's purpose",
  ipPoolSliceLabel: 'IP pool slice (CIDR)',
  memberNamePlaceholder: 'Full name',
  memberEmailPlaceholder: 'email@northsummitbank.com',
  membersEmptyTitle: 'No members added yet. You can also add them later.',
  membersInviteNote:
    'Invitees will receive an email to join the platform and be scoped to this project.',
  catalogLede:
    'Attach approved catalog items so project members can provision instances from your governed offerings.',
  catalogEmptyTitle: 'No approved catalog items yet. Approve offerings in Catalog manager first.',
  addMemberLabel: 'Add',
  continueLabel: 'Continue',
  createProjectLabel: 'Create project',
} as const

export const DEFAULT_ORG_POOL_CIDR = '203.0.113.0/24'
export const DEFAULT_PROJECT_IP_SLICE = '203.0.113.0/26'

export type CreateProjectWizardForm = {
  name: string
  description: string
  environmentType: TenantProjectEnvironment
  vcpuAllocation: number
  ramAllocationGb: number
  instanceQuota: number
  ipPoolSlice: string
  memberName: string
  memberEmail: string
  memberRole: TenantProjectMemberRole
  members: TenantProjectWizardMember[]
  catalogItems: TenantProjectCatalogItem[]
}

export const DEFAULT_CREATE_PROJECT_WIZARD_FORM: CreateProjectWizardForm = {
  name: 'Machine Learning Dev Team',
  description: 'GPU training and ML experimentation workloads for the data science group.',
  environmentType: 'development',
  vcpuAllocation: 80,
  ramAllocationGb: 512,
  instanceQuota: 7,
  ipPoolSlice: DEFAULT_PROJECT_IP_SLICE,
  memberName: 'Jordan Lee',
  memberEmail: 'jordan@northsummitbank.com',
  memberRole: 'developer',
  members: [
    {
      id: 'project_member_demo',
      name: 'Chris Morgan',
      email: 'chris@northsummitbank.com',
      role: 'developer',
    },
  ],
  catalogItems: [
    {
      id: 'compute-r750',
      displayName: 'Compute Node · Dell PowerEdge R750 3x · 512 GB DDR4-3200',
    },
  ],
}

export function generateProjectWizardMemberId(): string {
  const suffix = Math.random().toString(36).slice(2, 8)
  return `project_member_${suffix}`
}

export function isProjectMemberEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function getProjectMemberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

export function getTenantProjectMemberRoleShortLabel(role: TenantProjectMemberRole): string {
  return (
    TENANT_PROJECT_MEMBER_ROLES.find((entry) => entry.id === role)?.shortLabel ?? role
  )
}

export function isCatalogItemSelected(
  catalogItems: TenantProjectCatalogItem[],
  catalogItemId: string,
): boolean {
  return catalogItems.some((item) => item.id === catalogItemId)
}

export function toggleWizardCatalogItemSelection(
  catalogItems: TenantProjectCatalogItem[],
  catalogItem: TenantProjectCatalogItem,
  isChecked: boolean,
): TenantProjectCatalogItem[] {
  if (isChecked) {
    if (isCatalogItemSelected(catalogItems, catalogItem.id)) {
      return catalogItems
    }

    return [...catalogItems, catalogItem]
  }

  return catalogItems.filter((item) => item.id !== catalogItem.id)
}
