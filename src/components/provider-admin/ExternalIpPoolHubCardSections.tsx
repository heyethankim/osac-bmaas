import { Progress, ProgressMeasureLocation, Button, Content } from '@patternfly/react-core'
import { TENANT_EXTERNAL_IP_POOL_MANAGED_BY_LABEL } from '../../tenantAdmin/constants'
import {
  getExternalIpPoolAvailableAddresses,
  getExternalIpPoolCidrs,
  getExternalIpPoolTotalAddresses,
  type ExternalIpPool,
} from '../../providerAdmin/externalIpPools'
import { ExternalIpInventoryList } from './ExternalIpInventoryList'
import {
  EXTERNAL_IP_POOL_CARD_PREVIEW_LIMIT,
  formatExternalIpPoolStatusSubtext,
  getExternalIpPoolPreviewIps,
  type ExternalIp,
} from '../../providerAdmin/externalIps'
import type { TenantInstance } from '../../tenantUser/instances'

type ExternalIpPoolHubCardSectionsProps = {
  pool: ExternalIpPool
  inUseCount: number
}

export function ExternalIpPoolHubCardSpecs({
  pool,
  hideTenant = false,
  showManagedBy = false,
}: Pick<ExternalIpPoolHubCardSectionsProps, 'pool'> & {
  hideTenant?: boolean
  showManagedBy?: boolean
}) {
  const cidrs = getExternalIpPoolCidrs(pool)

  return (
    <dl className="provider-admin-catalog-items__specs-list provider-admin-external-networks-hub__card-specs">
      {showManagedBy ? (
        <div className="provider-admin-catalog-items__spec-row">
          <dt className="provider-admin-catalog-items__spec-label">Managed by</dt>
          <dd className="provider-admin-catalog-items__spec-value">
            {TENANT_EXTERNAL_IP_POOL_MANAGED_BY_LABEL}
          </dd>
        </div>
      ) : null}
      {hideTenant ? null : (
        <div className="provider-admin-catalog-items__spec-row">
          <dt className="provider-admin-catalog-items__spec-label">Tenant</dt>
          <dd className="provider-admin-catalog-items__spec-value">
            {pool.assignedOrganizationName ?? '—'}
          </dd>
        </div>
      )}
      <div className="provider-admin-catalog-items__spec-row">
        <dt className="provider-admin-catalog-items__spec-label">CIDR</dt>
        <dd className="provider-admin-catalog-items__spec-value">
          {cidrs.map((cidr) => (
            <span key={cidr} className="provider-admin-external-networks-hub__card-cidr-value">
              <code>{cidr}</code>
            </span>
          ))}
        </dd>
      </div>
    </dl>
  )
}

export function ExternalIpPoolHubCardCapacityFooter({
  pool,
  inUseCount,
  allocatedCount,
  variant = 'card',
}: ExternalIpPoolHubCardSectionsProps & {
  allocatedCount?: number
  variant?: 'card' | 'section'
}) {
  const { total, available, inUse } = getExternalIpPoolCapacityCounts(
    pool,
    inUseCount,
    allocatedCount,
  )

  return (
    <div
      className={[
        'provider-admin-external-networks-hub__card-capacity',
        variant === 'card'
          ? 'provider-admin-catalog-items__card-footer'
          : 'provider-admin-external-networks-hub__details-capacity',
      ].join(' ')}
      aria-label="External IP pool capacity"
    >
      <span className="provider-admin-external-networks-hub__card-capacity-heading">Capacity</span>
      <dl className="provider-admin-external-networks-hub__card-capacity-stats">
        <div className="provider-admin-external-networks-hub__card-capacity-stat">
          <dt className="provider-admin-external-networks-hub__card-capacity-stat-label">
            Available
          </dt>
          <dd className="provider-admin-external-networks-hub__card-capacity-stat-value">
            {available.toLocaleString()}
          </dd>
        </div>
        <div className="provider-admin-external-networks-hub__card-capacity-stat">
          <dt className="provider-admin-external-networks-hub__card-capacity-stat-label">In use</dt>
          <dd className="provider-admin-external-networks-hub__card-capacity-stat-value">
            {inUse.toLocaleString()}
          </dd>
        </div>
        <div className="provider-admin-external-networks-hub__card-capacity-stat">
          <dt className="provider-admin-external-networks-hub__card-capacity-stat-label">Total</dt>
          <dd className="provider-admin-external-networks-hub__card-capacity-stat-value">
            {total.toLocaleString()}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function getExternalIpPoolCapacityCounts(
  pool: ExternalIpPool,
  inUseCount: number,
  allocatedCount?: number,
) {
  const total = getExternalIpPoolTotalAddresses(pool)
  const consumed = allocatedCount ?? inUseCount
  const available = getExternalIpPoolAvailableAddresses(pool, consumed)
  const inUse =
    allocatedCount !== undefined ? inUseCount : Math.max(total - available, 0)

  return { total, available, inUse, consumed }
}

export function ExternalIpPoolIpsRailCapacityStrip({
  pool,
  inUseCount,
  allocatedCount,
}: ExternalIpPoolHubCardSectionsProps & {
  allocatedCount?: number
}) {
  const { total, available, inUse, consumed } = getExternalIpPoolCapacityCounts(
    pool,
    inUseCount,
    allocatedCount,
  )
  const allocatedPercent =
    total > 0 ? Math.min(100, Math.round((consumed / total) * 100)) : 0

  return (
    <div
      className="provider-admin-external-networks-hub__rail-capacity"
      aria-label="External IP pool capacity"
    >
      <Progress
        value={allocatedPercent}
        title={`${consumed.toLocaleString()} of ${total.toLocaleString()} addresses allocated`}
        measureLocation={ProgressMeasureLocation.top}
        size="sm"
        aria-label={`${consumed.toLocaleString()} of ${total.toLocaleString()} addresses allocated`}
      />
      <dl className="provider-admin-external-networks-hub__rail-capacity-stats">
        <div className="provider-admin-external-networks-hub__rail-capacity-stat">
          <dt className="provider-admin-external-networks-hub__rail-capacity-stat-label">
            Available
          </dt>
          <dd className="provider-admin-external-networks-hub__rail-capacity-stat-value">
            {available.toLocaleString()}
          </dd>
        </div>
        <div className="provider-admin-external-networks-hub__rail-capacity-stat">
          <dt className="provider-admin-external-networks-hub__rail-capacity-stat-label">
            In use
          </dt>
          <dd className="provider-admin-external-networks-hub__rail-capacity-stat-value">
            {inUse.toLocaleString()}
          </dd>
        </div>
        <div className="provider-admin-external-networks-hub__rail-capacity-stat">
          <dt className="provider-admin-external-networks-hub__rail-capacity-stat-label">
            Total
          </dt>
          <dd className="provider-admin-external-networks-hub__rail-capacity-stat-value">
            {total.toLocaleString()}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export function formatExternalIpPoolCapacitySummary(
  pool: ExternalIpPool,
  inUseCount: number,
  allocatedCount?: number,
): string {
  const total = getExternalIpPoolTotalAddresses(pool)
  const available = getExternalIpPoolAvailableAddresses(pool, allocatedCount ?? inUseCount)

  return `${available.toLocaleString()} of ${total.toLocaleString()} available`
}

export function ExternalIpPoolGridCardTitle({
  pool,
  ips,
  onOpenDetails,
}: {
  pool: ExternalIpPool
  ips: readonly ExternalIp[]
  onOpenDetails: () => void
}) {
  return (
    <div className="provider-admin-external-networks-hub__grid-pool-title">
      <Content component="p" className="provider-admin-catalog-items__primary-cell">
        <Button
          variant="link"
          isInline
          className="provider-admin-catalog-items__name-link catalog-item-name-link"
          onClick={onOpenDetails}
        >
          {pool.name}
        </Button>
      </Content>
      <span className="provider-admin-external-networks-hub__pool-meta">
        {formatExternalIpPoolStatusSubtext(ips)}
      </span>
    </div>
  )
}

export function ExternalIpPoolHubCardIps({
  ips,
  creatingIpId = null,
  maxPreview = EXTERNAL_IP_POOL_CARD_PREVIEW_LIMIT,
  onViewAll,
  serviceInstances,
  onNavigateToServiceInstance,
}: {
  ips: readonly ExternalIp[]
  creatingIpId?: string | null
  maxPreview?: number
  onViewAll?: () => void
  serviceInstances?: readonly TenantInstance[]
  onNavigateToServiceInstance?: (instance: TenantInstance) => void
}) {
  if (ips.length === 0 && creatingIpId === null) {
    return null
  }

  const previewIps = getExternalIpPoolPreviewIps(ips, maxPreview, creatingIpId)
  const hiddenCount = Math.max(ips.length - previewIps.length, 0)

  return (
    <div
      className="provider-admin-catalog-items__card-footer provider-admin-external-networks-hub__card-ips"
      aria-label="IPs"
    >
      <span className="provider-admin-external-networks-hub__card-capacity-heading">IPs</span>
      <ExternalIpInventoryList
        ips={previewIps}
        variant="card"
        creatingIpId={creatingIpId}
        serviceInstances={serviceInstances}
        onNavigateToServiceInstance={onNavigateToServiceInstance}
      />
      {hiddenCount > 0 && onViewAll ? (
        <Button
          variant="link"
          isInline
          className="provider-admin-external-networks-hub__card-ips-view-all"
          onClick={onViewAll}
        >
          View all {ips.length.toLocaleString()} IPs
        </Button>
      ) : null}
    </div>
  )
}
