import {
  Alert,
  AlertActionLink,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
} from '@patternfly/react-core'
import { ProviderAdminWorkspacePageHeader } from '../components/provider-admin/ProviderAdminWorkspacePageHeader'
import {
  getOrganizationsAssignedToCatalogItem,
  getProviderCatalogDraft,
  getProviderRegisteredOrganizations,
} from '../providerSetup/storage'

type ProviderAdminOverviewPageProps = {
  onGoToCatalog?: () => void
  onGoToOrganizations?: () => void
}

export function ProviderAdminOverviewPage({
  onGoToCatalog,
  onGoToOrganizations,
}: ProviderAdminOverviewPageProps) {
  const catalogDraft = getProviderCatalogDraft()
  const organizations = getProviderRegisteredOrganizations()
  const assignedOrganizations = catalogDraft
    ? getOrganizationsAssignedToCatalogItem(catalogDraft.catalogItemId)
    : []

  return (
    <div className="provider-admin-workspace-page provider-admin-overview">
      <ProviderAdminWorkspacePageHeader
        kicker="Provider workspace"
        title="Overview"
        lede="Publish catalog items from master templates and attach them to tenant organizations."
      />

      <DescriptionList
        isHorizontal
        isCompact
        className="provider-admin-overview__summary"
      >
        <DescriptionListGroup>
          <DescriptionListTerm>Catalog items</DescriptionListTerm>
          <DescriptionListDescription>
            {catalogDraft ? (
              <>
                <Content component="p" className="provider-admin-overview__primary-cell">
                  {catalogDraft.displayName}
                </Content>
                <Content component="p" className="provider-admin-overview__secondary-cell">
                  <code>{catalogDraft.catalogItemId}</code>
                </Content>
              </>
            ) : (
              'None published'
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Registered organizations</DescriptionListTerm>
          <DescriptionListDescription>{organizations.length}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Tenants with catalog access</DescriptionListTerm>
          <DescriptionListDescription>{assignedOrganizations.length}</DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>

      {!catalogDraft ? (
        <Alert
          variant="info"
          isInline
          title="Create your first catalog item"
          className="provider-admin-overview__alert"
          actionLinks={
            onGoToCatalog ? (
              <AlertActionLink component="button" onClick={onGoToCatalog}>
                Go to catalog
              </AlertActionLink>
            ) : undefined
          }
        >
          <Content component="p">
            Publish a BMaaS template to the catalog before attaching storefront access to tenant
            organizations.
          </Content>
        </Alert>
      ) : assignedOrganizations.length === 0 ? (
        <Alert
          variant="info"
          isInline
          title="Attach the catalog item to tenant organizations"
          className="provider-admin-overview__alert"
          actionLinks={
            onGoToOrganizations ? (
              <AlertActionLink component="button" onClick={onGoToOrganizations}>
                Go to organizations
              </AlertActionLink>
            ) : undefined
          }
        >
          <Content component="p">
            Your catalog item is live. Register a tenant organization or assign the item from the
            catalog page so tenant admins can provision instances.
          </Content>
        </Alert>
      ) : (
        <Alert
          variant="success"
          isInline
          title="Catalog item attached to tenants"
          className="provider-admin-overview__alert"
        >
          <Content component="p">
            {assignedOrganizations.map((organization) => organization.name).join(', ')}{' '}
            {assignedOrganizations.length === 1 ? 'has' : 'have'} access to{' '}
            <Label color="blue" isCompact>
              {catalogDraft.displayName}
            </Label>
            .
          </Content>
        </Alert>
      )}
    </div>
  )
}
