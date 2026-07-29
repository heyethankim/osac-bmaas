import { ProviderAdminWorkspacePageHeader } from '../components/provider-admin/ProviderAdminWorkspacePageHeader'

export function ProviderAdminQuotasPage() {
  return (
    <div className="provider-admin-workspace-page provider-admin-quotas">
      <ProviderAdminWorkspacePageHeader
        kicker="Administration"
        title="Quotas"
        lede="Set platform-wide resource ceilings and per-tenant allocation limits before commercialization."
      />
    </div>
  )
}
