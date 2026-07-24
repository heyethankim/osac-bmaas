import { useMemo } from 'react'
import { TenantAdminWorkspacePageHeader } from '../../components/tenant-admin/TenantAdminWorkspacePageHeader'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import {
  getTenantNetworkResourceMeta,
  type TenantNetworkResourceKind,
} from '../../tenantAdmin/networking'

type TenantAdminNetworkingPageProps = {
  tenantSlug: string
  organization: RegisteredOrganization
  catalogDraft: ProviderCatalogDraft | null
  kind: TenantNetworkResourceKind
}

export function TenantAdminNetworkingPage({ kind }: TenantAdminNetworkingPageProps) {
  const meta = useMemo(() => getTenantNetworkResourceMeta(kind), [kind])

  return (
    <div className="tenant-admin-workspace-page tenant-admin-networking">
      <TenantAdminWorkspacePageHeader
        kicker="Networking"
        title={meta.title}
        lede={meta.lede}
      />
    </div>
  )
}
