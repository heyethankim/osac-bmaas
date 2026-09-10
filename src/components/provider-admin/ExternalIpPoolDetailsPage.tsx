import { Link } from 'react-router-dom'
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Title,
} from '@patternfly/react-core'
import { EntityDetailsPageShell } from '../shared/EntityDetailsPageShell'
import { EntityDetailsActionsDropdown } from '../shared/EntityDetailsActionsDropdown'
import type { ExternalIpPool } from '../../providerAdmin/externalIpPools'
import {
  getExternalIpPoolDefaultDescription,
  getExternalIpPoolAvailableAddresses,
  getExternalIpPoolIpFamilyLabel,
  getExternalIpPoolCidrs,
  getExternalIpPoolLifecycleStatus,
  getExternalIpPoolLifecycleStatusLabelColor,
  getExternalIpPoolTotalAddresses,
} from '../../providerAdmin/externalIpPools'
import { PROVIDER_ADMIN_NETWORKING_NAV_LABEL } from '../../providerAdmin/constants'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import {
  getOrganizationNameInitial,
} from '../../providerAdmin/organizations'
import { buildProviderOrganizationWorkspacePath } from '../../shared/workspaceNavUrl'

type ExternalIpPoolDetailsPageProps = {
  pool: ExternalIpPool
  organization: RegisteredOrganization | null
  onBack: () => void
  /** Delete action; omitted for read-only views. */
  onDelete?: () => void
  readOnly?: boolean
  /** Current tenant organization when viewing from tenant admin/user workspaces. */
  scopeOrganization?: RegisteredOrganization | null
  inUseAddressCount?: number
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatAddressCount(count: number): string {
  return `${count.toLocaleString()} ${count === 1 ? 'address' : 'addresses'}`
}

function OrganizationTenantInlineMark({ name }: { name: string }) {
  return (
    <span
      className="provider-admin-catalog-items__card-icon provider-admin-organizations__card-logo provider-admin-organizations__card-logo--initial"
      aria-hidden
    >
      <span className="provider-admin-organizations__card-initial">
        {getOrganizationNameInitial(name)}
      </span>
    </span>
  )
}

export function ExternalIpPoolDetailsPage({
  pool,
  organization,
  onBack,
  onDelete,
  readOnly = false,
  scopeOrganization = null,
  inUseAddressCount = 0,
}: ExternalIpPoolDetailsPageProps) {
  const poolStatus = getExternalIpPoolLifecycleStatus(pool)
  const canDelete = !readOnly && Boolean(onDelete)
  const isTenantView = Boolean(scopeOrganization)
  const totalAddresses = getExternalIpPoolTotalAddresses(pool)
  const availableAddresses = getExternalIpPoolAvailableAddresses(pool, inUseAddressCount)
  const inUseAddresses = Math.max(inUseAddressCount, totalAddresses - availableAddresses)
  const tenantName = isTenantView
    ? scopeOrganization?.name
    : pool.assignedOrganizationName ?? organization?.name
  const tenantDomain = isTenantView
    ? scopeOrganization?.primaryDomain
    : organization?.primaryDomain
  const tenantOrganizationId = isTenantView
    ? scopeOrganization?.id ?? null
    : organization?.id ?? pool.assignedOrganizationId

  return (
    <EntityDetailsPageShell
      parentLabel={isTenantView ? 'External networks' : PROVIDER_ADMIN_NETWORKING_NAV_LABEL}
      onBack={onBack}
      title={pool.name}
      titleId="external-ip-pool-details-title"
      description={
        pool.description ??
        (isTenantView
          ? 'Routable addresses available for workloads in your tenant.'
          : getExternalIpPoolDefaultDescription(pool))
      }
      actions={
        canDelete ? (
          <EntityDetailsActionsDropdown onRemove={onDelete} removeLabel="Delete" />
        ) : undefined
      }
    >
      <div className="entity-details-page__columns">
        <div className="entity-details-page__column">
          <Title
            headingLevel="h2"
            size="lg"
            className="entity-details-page__section-title"
          >
            Overview
          </Title>
          <DescriptionList
            isCompact
            className="entity-details-page__dl"
            aria-label="External IP pool overview"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>Status</DescriptionListTerm>
              <DescriptionListDescription>
                <Label color={getExternalIpPoolLifecycleStatusLabelColor(poolStatus)} isCompact>
                  {poolStatus}
                </Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Tenant</DescriptionListTerm>
              <DescriptionListDescription>
                {tenantName ? (
                  <div className="provider-admin-network-inventory__tenant-ref">
                    <OrganizationTenantInlineMark name={tenantName} />
                    <div className="provider-admin-network-inventory__tenant-ref-copy">
                      {!isTenantView && tenantOrganizationId ? (
                        <Link
                          to={buildProviderOrganizationWorkspacePath(tenantOrganizationId)}
                          className="provider-admin-network-inventory__related-link"
                        >
                          {tenantName}
                        </Link>
                      ) : (
                        tenantName
                      )}
                      {tenantDomain ? (
                        <span className="provider-admin-network-inventory__tenant-domain">
                          {tenantDomain}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  '—'
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Created</DescriptionListTerm>
              <DescriptionListDescription>
                {formatCreatedAt(pool.createdAt)}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </div>

        <div className="entity-details-page__column">
          <Title
            headingLevel="h2"
            size="lg"
            className="entity-details-page__section-title"
          >
            CIDR
          </Title>
          <DescriptionList
            isCompact
            className="entity-details-page__dl"
            aria-label="External IP pool CIDR"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>
                {getExternalIpPoolIpFamilyLabel(pool.ipFamily ?? 'IPv4')}
              </DescriptionListTerm>
              <DescriptionListDescription>
                {getExternalIpPoolCidrs(pool).map((cidr) => (
                  <span key={cidr}>
                    <code>{cidr}</code>
                    <br />
                  </span>
                ))}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </div>

        <div className="entity-details-page__column">
          <Title
            headingLevel="h2"
            size="lg"
            className="entity-details-page__section-title"
          >
            Capacity
          </Title>
          <DescriptionList
            isCompact
            className="entity-details-page__dl"
            aria-label="External IP pool capacity"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>Available</DescriptionListTerm>
              <DescriptionListDescription>
                {formatAddressCount(availableAddresses)}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>In use</DescriptionListTerm>
              <DescriptionListDescription>
                {formatAddressCount(inUseAddresses)}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Total</DescriptionListTerm>
              <DescriptionListDescription>
                {formatAddressCount(totalAddresses)}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </div>
      </div>
    </EntityDetailsPageShell>
  )
}
