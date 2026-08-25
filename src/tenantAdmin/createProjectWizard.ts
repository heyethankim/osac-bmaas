import type {
  TenantProject,
  TenantProjectCatalogItem,
  TenantProjectEnvironment,
  TenantProjectMemberRole,
} from './projects'

export type CreateProjectWizardStepId = 'project-info' | 'team-members' | 'review'

export type { TenantProjectEnvironment, TenantProjectMemberRole } from './projects'

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
    id: 'team-members',
    label: 'Team Members',
    description: '',
  },
  {
    id: 'review',
    label: 'Review',
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
  {
    id: 'manager',
    label: 'Manager — Can create, edit, and delete projects',
    shortLabel: 'Manager',
  },
  {
    id: 'viewer',
    label: 'Viewer — Has view access only',
    shortLabel: 'Viewer',
  },
]

export const CREATE_PROJECT_WIZARD_DEMO = {
  projectNamePlaceholder: 'e.g. edge-inference',
  descriptionPlaceholder: "Optional — describe this project's purpose",
  memberNamePlaceholder: 'Full name',
  memberEmailPlaceholder: 'email@northsummitbank.com',
  membersEmptyTitle: 'No members added yet. You can also add them later.',
  membersInviteNote:
    'Invitees will receive an email to join the platform and be scoped to this project.',
  reviewLede: 'Confirm project details before creating.',
  reviewEditLede: 'Review your changes before saving.',
  reviewNoDescription: 'No description',
  reviewNoMembers: 'No members yet — you can invite them later.',
  addMemberLabel: 'Add',
  continueLabel: 'Continue',
  createProjectLabel: 'Create project',
  createNestedProjectLabel: 'Create nested project',
  editProjectLabel: 'Edit project',
  saveProjectLabel: 'Save',
  parentProjectLabel: 'Parent project',
} as const

export const DEFAULT_PROJECT_IP_SLICE = '203.0.113.0/26'

export type CreateProjectWizardForm = {
  name: string
  description: string
  environmentType: TenantProjectEnvironment
  vcpuAllocation: number
  ramAllocationGb: number
  instanceQuota: number
  externalIpPoolId: string
  ipPoolSlice: string
  memberName: string
  memberEmail: string
  memberRole: TenantProjectMemberRole
  members: TenantProjectWizardMember[]
}

export const DEFAULT_CREATE_PROJECT_WIZARD_FORM: CreateProjectWizardForm = {
  name: 'edge-inference',
  description: 'Low-latency inference and edge rollout workloads for branch and regional sites.',
  environmentType: 'development',
  vcpuAllocation: 80,
  ramAllocationGb: 512,
  instanceQuota: 7,
  externalIpPoolId: '',
  ipPoolSlice: DEFAULT_PROJECT_IP_SLICE,
  memberName: 'Jordan Lee',
  memberEmail: 'jordan@northsummitbank.com',
  memberRole: 'manager',
  members: [
    {
      id: 'project-member-demo',
      name: 'Chris Morgan',
      email: 'chris@northsummitbank.com',
      role: 'manager',
    },
  ],
}

export function formFromTenantProject(project: TenantProject): CreateProjectWizardForm {
  return {
    name: project.name,
    description: project.description,
    environmentType: project.environmentType,
    vcpuAllocation: DEFAULT_CREATE_PROJECT_WIZARD_FORM.vcpuAllocation,
    ramAllocationGb: DEFAULT_CREATE_PROJECT_WIZARD_FORM.ramAllocationGb,
    instanceQuota: project.instanceQuota,
    externalIpPoolId: project.externalIpPoolId ?? '',
    ipPoolSlice: project.externalIpPoolCidr ?? DEFAULT_PROJECT_IP_SLICE,
    memberName: '',
    memberEmail: '',
    memberRole: 'manager',
    members: project.members.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
    })),
  }
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
