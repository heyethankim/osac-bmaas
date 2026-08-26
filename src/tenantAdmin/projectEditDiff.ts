import type { RegisteredOrganization } from '../providerAdmin/organizations'
import type { CreateProjectWizardStepId } from './createProjectWizard'
import {
  CREATE_PROJECT_WIZARD_DEMO,
  formFromTenantProject,
  getTenantProjectMemberRoleShortLabel,
  type CreateProjectWizardForm,
  type TenantProjectWizardMember,
} from './createProjectWizard'
import {
  resolveOrganizationExternalIpPools,
  type TenantProject,
} from './projects'

type SnapshotValue = {
  compare: string
  display: string
}

export type ProjectEditSnapshot = {
  name: SnapshotValue
  description: SnapshotValue
  instanceQuota: SnapshotValue
  externalIpPool: SnapshotValue
  members: SnapshotValue
}

export type ProjectEditChangeRow = {
  id: keyof ProjectEditSnapshot
  stepId: CreateProjectWizardStepId
  label: string
  before: string
  after: string
}

const EMPTY_SNAPSHOT_VALUE: SnapshotValue = { compare: '', display: '—' }

function snapshotValue(compare: string, display: string): SnapshotValue {
  const normalized = compare.trim()
  return {
    compare: normalized,
    display: display.trim() || '—',
  }
}

function formatDescription(description: string): string {
  return description.trim() || CREATE_PROJECT_WIZARD_DEMO.reviewNoDescription
}

function formatInstanceQuota(quota: number, parentProjectName?: string | null): string {
  const countLabel = `${quota} instance${quota === 1 ? '' : 's'}`
  return parentProjectName ? `${countLabel} from ${parentProjectName}` : countLabel
}

function formatExternalIpPool(
  poolId: string | null,
  poolName: string | null,
  poolCidr: string | null,
  organization: RegisteredOrganization,
): string {
  const pools = resolveOrganizationExternalIpPools(organization)
  const resolved =
    pools.find((pool) => pool.id === poolId) ??
    (poolName ? { id: poolId ?? '', name: poolName, cidr: poolCidr ?? '' } : null)

  if (!resolved) {
    return poolCidr?.trim() || '—'
  }

  const cidr = poolCidr?.trim() || resolved.cidr
  return `${resolved.name} (${cidr})`
}

function serializeMembers(members: readonly TenantProjectWizardMember[]): string {
  return JSON.stringify(
    [...members]
      .sort((left, right) => left.email.localeCompare(right.email))
      .map((member) => ({
        id: member.id,
        name: member.name.trim(),
        email: member.email.trim().toLowerCase(),
        role: member.role,
      })),
  )
}

function formatMembers(members: readonly TenantProjectWizardMember[]): string {
  if (members.length === 0) {
    return CREATE_PROJECT_WIZARD_DEMO.reviewNoMembers
  }

  return [...members]
    .sort((left, right) => left.email.localeCompare(right.email))
    .map(
      (member) =>
        `${member.name} · ${member.email} · ${getTenantProjectMemberRoleShortLabel(member.role)}`,
    )
    .join('; ')
}

export function buildProjectEditSnapshotFromForm(
  form: CreateProjectWizardForm,
  organization: RegisteredOrganization,
  parentProjectName: string | null,
): ProjectEditSnapshot {
  const pools = resolveOrganizationExternalIpPools(organization)
  const organizationPool =
    pools.find((pool) => pool.id === form.externalIpPoolId) ?? pools[0] ?? null
  const poolCidr = form.ipPoolSlice.trim() || organizationPool?.cidr || ''

  return {
    name: snapshotValue(form.name, form.name.trim() || '—'),
    description: snapshotValue(form.description, formatDescription(form.description)),
    instanceQuota: snapshotValue(
      String(form.instanceQuota),
      formatInstanceQuota(form.instanceQuota, parentProjectName),
    ),
    externalIpPool: snapshotValue(
      `${form.externalIpPoolId}:${poolCidr}`,
      formatExternalIpPool(
        organizationPool?.id ?? form.externalIpPoolId,
        organizationPool?.name ?? null,
        poolCidr,
        organization,
      ),
    ),
    members: snapshotValue(serializeMembers(form.members), formatMembers(form.members)),
  }
}

export function buildProjectEditSnapshotFromProject(
  project: TenantProject,
  organization: RegisteredOrganization,
  parentProjectName: string | null,
): ProjectEditSnapshot {
  return buildProjectEditSnapshotFromForm(
    formFromTenantProject(project),
    organization,
    parentProjectName,
  )
}

const PROJECT_EDIT_FIELD_CONFIG: ReadonlyArray<{
  id: keyof ProjectEditSnapshot
  stepId: CreateProjectWizardStepId
  label: string
}> = [
  { id: 'name', stepId: 'project-info', label: 'Project name' },
  { id: 'description', stepId: 'project-info', label: 'Description' },
  { id: 'instanceQuota', stepId: 'project-info', label: 'Instance quota' },
  { id: 'externalIpPool', stepId: 'project-info', label: 'External IP pool' },
  { id: 'members', stepId: 'team-members', label: 'Team members' },
]

export function getProjectEditChanges(
  baseline: ProjectEditSnapshot,
  current: ProjectEditSnapshot,
): ProjectEditChangeRow[] {
  return PROJECT_EDIT_FIELD_CONFIG.flatMap((field) => {
    const beforeValue = baseline[field.id] ?? EMPTY_SNAPSHOT_VALUE
    const afterValue = current[field.id] ?? EMPTY_SNAPSHOT_VALUE

    if (beforeValue.compare === afterValue.compare) {
      return []
    }

    return [
      {
        id: field.id,
        stepId: field.stepId,
        label: field.label,
        before: beforeValue.display,
        after: afterValue.display,
      },
    ]
  })
}

export function getProjectEditModifiedStepIds(
  changes: ProjectEditChangeRow[],
): Set<CreateProjectWizardStepId> {
  return new Set(changes.map((change) => change.stepId))
}
