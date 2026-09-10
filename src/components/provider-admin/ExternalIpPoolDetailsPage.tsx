import { Link } from 'react-router-dom'
import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Title,
} from '@patternfly/react-core'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
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
import {
  getExternalIpAttachmentLabel,
  getExternalIpStatusLabelColor,
  type ExternalIp,
} from '../../providerAdmin/externalIps'
import { PROVIDER_ADMIN_NETWORKING_NAV_LABEL } from '../../providerAdmin/constants'
import { TENANT_EXTERNAL_IPS_PAGE_LABEL, TENANT_EXTERNAL_IP_POOL_MANAGED_BY_LABEL } from '../../tenantAdmin/constants'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import { getOrganizationNameInitial } from '../../providerAdmin/organizations'
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
  allocatedAddressCount?: number
  ips?: readonly ExternalIp[]
  onCreateExternalIp?: () => void
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

function ExternalIpPoolCapacitySection({
  availableAddresses,
  inUseAddresses,
  totalAddresses,
}: {
  availableAddresses: number
  inUseAddresses: number
  totalAddresses: number
}) {
  return (
    <>
      <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
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
    </>
  )
}

function ExternalIpPoolExternalIpsRail({
  ips,
  onCreateExternalIp,
}: {
  ips: readonly ExternalIp[]
  onCreateExternalIp?: () => void
}) {
  return (
    <div className="entity-details-page__rail-stack">
      <div className="entity-details-page__column entity-details-page__column--config">
        <div className="entity-details-page__column-block">
          <div className="entity-details-page__section-header entity-details-page__section-header--config">
            <Title
              headingLevel="h2"
              size="md"
              className="entity-details-page__section-title entity-details-page__section-title--config"
            >
              IPs
            </Title>
            {onCreateExternalIp ? (
              <Button
                variant="link"
                isInline
                icon={<PlusIcon />}
                className="entity-details-page__add-node-set"
                aria-label="Create external IP"
                onClick={onCreateExternalIp}
              >
                Create
              </Button>
            ) : null}
          </div>
          {ips.length === 0 ? (
            <Content
              component="p"
              className="provider-admin-network-inventory__drawer-related-empty"
            >
              No IPs have been allocated from this pool yet.
            </Content>
          ) : (
            <ul className="provider-admin-external-networks-hub__card-ip-list provider-admin-external-networks-hub__details-ip-list">
              {ips.map((ip) => {
                const attachmentLabel = getExternalIpAttachmentLabel(ip)

                return (
                  <li key={ip.id} className="provider-admin-external-networks-hub__card-ip-item">
                    <div className="provider-admin-external-networks-hub__card-ip-primary">
                      <code>{ip.address}</code>
                      <Label color={getExternalIpStatusLabelColor(ip.status)} isCompact>
                        {ip.status}
                      </Label>
                    </div>
                    {attachmentLabel ? (
                      <Content
                        component="p"
                        className="provider-admin-external-networks-hub__card-ip-meta"
                      >
                        {attachmentLabel}
                      </Content>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
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
  allocatedAddressCount,
  ips = [],
  onCreateExternalIp,
}: ExternalIpPoolDetailsPageProps) {
  const poolStatus = getExternalIpPoolLifecycleStatus(pool)
  const canDelete = !readOnly && Boolean(onDelete)
  const isTenantView = Boolean(scopeOrganization)
  const totalAddresses = getExternalIpPoolTotalAddresses(pool)
  const consumedAddresses = allocatedAddressCount ?? inUseAddressCount
  const availableAddresses = getExternalIpPoolAvailableAddresses(pool, consumedAddresses)
  const inUseAddresses =
    allocatedAddressCount !== undefined
      ? inUseAddressCount
      : Math.max(inUseAddressCount, totalAddresses - availableAddresses)
  const tenantName = pool.assignedOrganizationName ?? organization?.name
  const tenantOrganizationId = organization?.id ?? pool.assignedOrganizationId
  const tenantDomain = organization?.primaryDomain

  const overviewColumn = (
    <div className="entity-details-page__column">
      <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
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
        {!isTenantView ? (
          <DescriptionListGroup>
            <DescriptionListTerm>Tenant</DescriptionListTerm>
            <DescriptionListDescription>
              {tenantName ? (
                <div className="provider-admin-network-inventory__tenant-ref">
                  <OrganizationTenantInlineMark name={tenantName} />
                  <div className="provider-admin-network-inventory__tenant-ref-copy">
                    {tenantOrganizationId ? (
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
        ) : null}
        <DescriptionListGroup>
          <DescriptionListTerm>{isTenantView ? 'Managed by' : 'Created'}</DescriptionListTerm>
          <DescriptionListDescription>
            {isTenantView ? TENANT_EXTERNAL_IP_POOL_MANAGED_BY_LABEL : formatCreatedAt(pool.createdAt)}
          </DescriptionListDescription>
        </DescriptionListGroup>
        {isTenantView ? (
          <DescriptionListGroup>
            <DescriptionListTerm>Assigned</DescriptionListTerm>
            <DescriptionListDescription>{formatCreatedAt(pool.createdAt)}</DescriptionListDescription>
          </DescriptionListGroup>
        ) : null}
      </DescriptionList>
    </div>
  )

  const cidrSection = (
    <>
      <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
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
    </>
  )

  const capacitySection = (
    <ExternalIpPoolCapacitySection
      availableAddresses={availableAddresses}
      inUseAddresses={inUseAddresses}
      totalAddresses={totalAddresses}
    />
  )

  return (
    <EntityDetailsPageShell
      parentLabel={isTenantView ? TENANT_EXTERNAL_IPS_PAGE_LABEL : PROVIDER_ADMIN_NETWORKING_NAV_LABEL}
      onBack={onBack}
      title={pool.name}
      titleId="external-ip-pool-details-title"
      description={
        isTenantView
          ? 'Provider-assigned routable addresses available for your workloads.'
          : pool.description ?? getExternalIpPoolDefaultDescription(pool)
      }
      actions={
        canDelete ? (
          <EntityDetailsActionsDropdown onRemove={onDelete} removeLabel="Delete" />
        ) : undefined
      }
    >
      <div
        className={[
          'entity-details-page__columns',
          isTenantView ? 'entity-details-page__columns--with-rail' : '',
        ].join(' ')}
      >
        {isTenantView ? (
          <div className="entity-details-page__main-stack">
            <div className="entity-details-page__columns entity-details-page__columns--2">
              {overviewColumn}
              <div className="entity-details-page__column">
                {cidrSection}
                {capacitySection}
              </div>
            </div>
          </div>
        ) : (
          <>
            {overviewColumn}
            <div className="entity-details-page__column">{cidrSection}</div>
            <div className="entity-details-page__column">{capacitySection}</div>
          </>
        )}
        {isTenantView ? (
          <ExternalIpPoolExternalIpsRail ips={ips} onCreateExternalIp={onCreateExternalIp} />
        ) : null}
      </div>
    </EntityDetailsPageShell>
  )
}
