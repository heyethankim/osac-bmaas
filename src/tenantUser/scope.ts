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
 * Resolve launch/ownership scope from the Catalog/Services project switcher.
 * - All projects (or missing selection) → organization-scoped
 * - Specific project id → that project
 */
export function resolveTenantUserLaunchScope(
  tenantSlug: DemoTenantId,
  organization: RegisteredOrganization | null,
  selectedProjectId?: string | null,
): TenantUserLaunchScope {
  const organizationName = organization?.name ?? DEMO_TENANT_LABEL[tenantSlug]

  if (selectedProjectId) {
    const project = getTenantProjects(tenantSlug).find((entry) => entry.id === selectedProjectId)
    if (project) {
      return {
        kind: 'project',
        label: project.name,
        fieldLabel: 'Project',
      }
    }
  }

  return {
    kind: 'organization',
    label: organizationName,
    fieldLabel: 'Organization',
  }
}

export function getTenantUserScopeFieldLabel(
  kind: TenantUserScopeKind | undefined,
): 'Organization' | 'Project' {
  return kind === 'organization' ? 'Organization' : 'Project'
}
