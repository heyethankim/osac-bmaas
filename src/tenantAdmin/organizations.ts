import type { RegisteredOrganization } from '../providerAdmin/organizations'
import { DEFAULT_REGISTER_ORGANIZATION_FORM } from '../providerAdmin/organizations'
import { getExternalIpPoolById } from '../providerAdmin/externalIpPools'
import { getProviderCatalogDraft, getProviderExternalIpPools, getProviderRegisteredOrganizations } from '../providerSetup/storage'
import { resolveTenantCatalogView, DEFAULT_TENANT_CATALOG_DISPLAY_NAME } from '../tenantAdmin/catalog'
import { resolveOrganizationExternalIpPool } from '../tenantAdmin/projects'
import { DEMO_TENANT_DISPLAY_ADMIN, DEMO_TENANT_LABEL, isDemoTenantId } from '../demoTenant'

function resolveDefaultExternalIpPoolFields(): Pick<
  RegisteredOrganization,
  'externalIpPoolId' | 'externalIpPoolName' | 'externalIpPoolCidr'
> {
  const pool = getExternalIpPoolById(
    getProviderExternalIpPools(),
    DEFAULT_REGISTER_ORGANIZATION_FORM.externalIpPoolId,
  )

  if (!pool) {
    return {
      externalIpPoolId: null,
      externalIpPoolName: null,
      externalIpPoolCidr: null,
    }
  }

  return {
    externalIpPoolId: pool.id,
    externalIpPoolName: pool.name,
    externalIpPoolCidr: pool.cidr,
  }
}

export function getRegisteredOrganizationBySlug(slug: string): RegisteredOrganization | null {
  return (
    getProviderRegisteredOrganizations().find((organization) => organization.slug === slug) ?? null
  )
}

export function getWorkspaceOrganization(slug: string): RegisteredOrganization {
  const catalogDraft = getProviderCatalogDraft()
  const defaultCatalogDisplayName = DEFAULT_TENANT_CATALOG_DISPLAY_NAME
  const registered = getRegisteredOrganizationBySlug(slug)

  if (registered) {
    const catalogView = resolveTenantCatalogView(registered, catalogDraft)
    const externalIpPool = resolveOrganizationExternalIpPool(registered)
    const enrichedOrganization = {
      ...registered,
      externalIpPoolId: externalIpPool?.id ?? registered.externalIpPoolId,
      externalIpPoolName: externalIpPool?.name ?? registered.externalIpPoolName,
      externalIpPoolCidr: externalIpPool?.cidr ?? registered.externalIpPoolCidr,
    }

    if (catalogView) {
      return {
        ...enrichedOrganization,
        catalogItemId: catalogView.catalogItemId,
        catalogDisplayName: catalogView.displayName,
      }
    }

    if (registered.catalogDisplayName) {
      return enrichedOrganization
    }

    return {
      ...enrichedOrganization,
      catalogItemId: catalogDraft?.catalogItemId ?? registered.catalogItemId,
      catalogDisplayName: defaultCatalogDisplayName,
    }
  }

  const tenantLabel = isDemoTenantId(slug) ? DEMO_TENANT_LABEL[slug] : slug
  const defaultExternalIpPool = resolveDefaultExternalIpPoolFields()

  return {
    id: 'org_demo',
    name: tenantLabel,
    tenantId: 'tenant-demo',
    slug,
    billingAccountId: DEFAULT_REGISTER_ORGANIZATION_FORM.billingAccountId,
    billingAccountName: DEFAULT_REGISTER_ORGANIZATION_FORM.billingAccountName,
    catalogItemId: catalogDraft?.catalogItemId ?? null,
    catalogDisplayName: catalogDraft?.displayName ?? defaultCatalogDisplayName,
    ...defaultExternalIpPool,
    maxInstances: Number.parseInt(DEFAULT_REGISTER_ORGANIZATION_FORM.maxInstances, 10),
    tenantAdminName: isDemoTenantId(slug)
      ? DEMO_TENANT_DISPLAY_ADMIN[slug]
      : DEFAULT_REGISTER_ORGANIZATION_FORM.tenantAdminName,
    tenantAdminEmail: DEFAULT_REGISTER_ORGANIZATION_FORM.tenantAdminEmail,
    status: 'Pending activation',
    createdAt: new Date().toISOString(),
  }
}
