import { TenantAdminWorkspacePageHeader } from '../../components/tenant-admin/TenantAdminWorkspacePageHeader'

export function TenantAdminOverviewPage() {
  return (
    <div className="provider-admin-workspace-page tenant-admin-overview">
      <TenantAdminWorkspacePageHeader
        kicker="Tenant workspace"
        title="Overview"
        lede="Monitor your tenant's instances, catalog access, and project activity."
      />
    </div>
  )
}
