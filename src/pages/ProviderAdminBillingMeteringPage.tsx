import { ProviderAdminWorkspacePageHeader } from '../components/provider-admin/ProviderAdminWorkspacePageHeader'

export function ProviderAdminBillingMeteringPage() {
  return (
    <div className="provider-admin-workspace-page provider-admin-billing">
      <ProviderAdminWorkspacePageHeader
        kicker="Administration"
        title="Billing & metering"
        lede="Usage metering and reconciliation will land in a later release. MVP billing is M360 account linking and rate visibility at publish and launch."
      />
    </div>
  )
}
