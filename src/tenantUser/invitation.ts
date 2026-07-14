import type { RegisteredOrganization } from '../providerAdmin/organizations'
import { DEMO_TENANT_LABEL, type DemoTenantId } from '../demoTenant'
import { DEMO_TENANT_USER_PROJECT_INVITATION } from './constants'
import { resolveOrganizationExternalIpPool } from '../tenantAdmin/projects'

export type TenantUserProjectInvitation = {
  projectName: string
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
}

export function getTenantUserProjectInvitation(
  tenantSlug: DemoTenantId,
  organization: RegisteredOrganization | null,
): TenantUserProjectInvitation {
  const organizationPool = organization ? resolveOrganizationExternalIpPool(organization) : null
  const workspaceName = organization?.name ?? DEMO_TENANT_LABEL[tenantSlug]

  return {
    projectName: DEMO_TENANT_USER_PROJECT_INVITATION.projectName,
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
    ipPoolName: organizationPool?.name ?? 'Northstar public edge',
    permissionsSummary: DEMO_TENANT_USER_PROJECT_INVITATION.permissionsSummary,
    scopeNote: DEMO_TENANT_USER_PROJECT_INVITATION.scopeNote,
  }
}
