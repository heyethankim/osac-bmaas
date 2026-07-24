import { ProviderAdminWorkspacePageHeader } from '../components/provider-admin/ProviderAdminWorkspacePageHeader'

export function ProviderAdminOverviewPage() {
  return (
    <div className="provider-admin-workspace-page provider-admin-overview">
      <ProviderAdminWorkspacePageHeader
        kicker="Provider workspace"
        title="Overview"
        lede="Publish catalog items from master templates and attach them to tenant organizations."
      />
    </div>
  )
}
