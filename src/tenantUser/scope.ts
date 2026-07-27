import type { RegisteredOrganization } from '../providerAdmin/organizations'
import { getTenantProjects } from '../tenantAdmin/storage'
import { DEMO_TENANT_LABEL, type DemoTenantId } from '../demoTenant'

export type TenantUserScopeKind = 'organization' | 'project'

export type TenantUserLaunchScope = {
  kind: TenantUserScopeKind
  /** Value stored on the instance and shown in details. */
  label: string
  /** Description-list / table column label. */
  fieldLabel: 'Organization' | 'Project'
}

/**
 * Resolve launch/ownership scope from real Tenant Admin projects.
 * - No projects → organization-scoped
 * - One or more projects → use the first project (picker comes later)
 */
export function resolveTenantUserLaunchScope(
  tenantSlug: DemoTenantId,
  organization: RegisteredOrganization | null,
): TenantUserLaunchScope {
  const projects = getTenantProjects(tenantSlug)
  const organizationName = organization?.name ?? DEMO_TENANT_LABEL[tenantSlug]

  if (projects.length === 0) {
    return {
      kind: 'organization',
      label: organizationName,
      fieldLabel: 'Organization',
    }
  }

  return {
    kind: 'project',
    label: projects[0].name,
    fieldLabel: 'Project',
  }
}

export function getTenantUserScopeFieldLabel(
  kind: TenantUserScopeKind | undefined,
): 'Organization' | 'Project' {
  return kind === 'organization' ? 'Organization' : 'Project'
}
