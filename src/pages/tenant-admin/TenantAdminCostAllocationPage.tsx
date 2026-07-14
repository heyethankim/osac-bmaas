import { Content } from '@patternfly/react-core'
import { TenantAdminWorkspacePageHeader } from '../../components/tenant-admin/TenantAdminWorkspacePageHeader'

export function TenantAdminCostAllocationPage() {
  return (
    <div className="tenant-admin-workspace-page tenant-admin-cost-allocation">
      <TenantAdminWorkspacePageHeader
        kicker="Finance"
        title="Cost allocation"
        lede="Track spend by team, project, and catalog item across your organization's BMaaS footprint."
      />
      <Content component="p" className="tenant-admin-cost-allocation__empty">
        Cost allocation views will appear here once metering data is available for your organization.
      </Content>
    </div>
  )
}
