import { Content } from '@patternfly/react-core'
import { TenantAdminWorkspacePageHeader } from '../../components/tenant-admin/TenantAdminWorkspacePageHeader'

export function TenantAdminFinancialAuditPage() {
  return (
    <div className="tenant-admin-workspace-page tenant-admin-financial-audit">
      <TenantAdminWorkspacePageHeader
        kicker="Compliance"
        title="Financial audit"
        lede="Review billing events, rate changes, and quota adjustments for your organization."
      />
      <Content component="p" className="tenant-admin-financial-audit__empty">
        Financial audit records will appear here as billing and quota events are recorded for your
        organization.
      </Content>
    </div>
  )
}
