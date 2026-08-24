import type { RegisteredOrganization } from '../providerAdmin/organizations'
import { DEMO_TENANT_LABEL, type DemoTenantId } from '../demoTenant'
import { DEMO_TENANT_USER_PROJECT_INVITATION } from './constants'
import { resolveOrganizationExternalIpPool } from '../tenantAdmin/projects'
import {
  resolveTenantUserLaunchScope,
  type TenantUserScopeKind,
} from './scope'

export type TenantUserProjectInvitation = {
  scopeKind: TenantUserScopeKind
  scopeLabel: string
  scopeFieldLabel: 'Tenant' | 'Project'
  projectEnvironment: string
  workspaceName: string
  role: string
  roleDescription: string
  invitedByName: string
  invitedByEmail: string
  instanceQuota: number
  resourcesLabel: string
  ipPoolCidr: string
  ipPoolName: string
  permissionsSummary: string
  scopeNote: string
  /** @deprecated Use scopeLabel — kept for gradual call-site updates */
  projectName: string
}

export function getTenantUserProjectInvitation(
  tenantSlug: DemoTenantId,
  organization: RegisteredOrganization | null,
  selectedProjectId?: string | null,
): TenantUserProjectInvitation {
  const organizationPool = organization ? resolveOrganizationExternalIpPool(organization) : null
  const workspaceName = organization?.name ?? DEMO_TENANT_LABEL[tenantSlug]
  const scope = resolveTenantUserLaunchScope(tenantSlug, organization, selectedProjectId)
  const isOrganizationScope = scope.kind === 'organization'

  return {
    scopeKind: scope.kind,
    scopeLabel: scope.label,
    scopeFieldLabel: scope.fieldLabel,
    projectName: scope.label,
    projectEnvironment: DEMO_TENANT_USER_PROJECT_INVITATION.projectEnvironment,
    workspaceName,
    role: DEMO_TENANT_USER_PROJECT_INVITATION.role,
    roleDescription: DEMO_TENANT_USER_PROJECT_INVITATION.roleDescription,
    invitedByName: organization?.tenantAdminName ?? DEMO_TENANT_USER_PROJECT_INVITATION.invitedByName,
    invitedByEmail:
      organization?.tenantAdminEmail ?? DEMO_TENANT_USER_PROJECT_INVITATION.invitedByEmail,
    instanceQuota: DEMO_TENANT_USER_PROJECT_INVITATION.instanceQuota,
    resourcesLabel: DEMO_TENANT_USER_PROJECT_INVITATION.resourcesLabel,
    ipPoolCidr: organizationPool?.cidr ?? '203.0.113.0/26',
    ipPoolName: organizationPool?.name ?? 'northsummit-public-edge',
    permissionsSummary: isOrganizationScope
      ? DEMO_TENANT_USER_PROJECT_INVITATION.organizationPermissionsSummary
      : DEMO_TENANT_USER_PROJECT_INVITATION.projectPermissionsSummary,
    scopeNote: isOrganizationScope
      ? DEMO_TENANT_USER_PROJECT_INVITATION.organizationScopeNote
      : `${DEMO_TENANT_USER_PROJECT_INVITATION.projectScopeNotePrefix} ${scope.label} ${DEMO_TENANT_USER_PROJECT_INVITATION.projectScopeNoteSuffix}`,
  }
}
