import { Content, Label, Spinner } from '@patternfly/react-core'
import { TENANT_EXTERNAL_IP_POOL_MANAGED_BY_LABEL } from '../../tenantAdmin/constants'
import {
  getExternalIpPoolAvailableAddresses,
  getExternalIpPoolCidrs,
  getExternalIpPoolTotalAddresses,
  type ExternalIpPool,
} from '../../providerAdmin/externalIpPools'
import {
  getExternalIpAttachmentLabel,
  getExternalIpStatusLabelColor,
  type ExternalIp,
} from '../../providerAdmin/externalIps'

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
  const total = getExternalIpPoolTotalAddresses(pool)
  const consumed = allocatedCount ?? inUseCount
  const available = getExternalIpPoolAvailableAddresses(pool, consumed)
  const inUse =
    allocatedCount !== undefined ? inUseCount : Math.max(total - available, 0)

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

export function formatExternalIpPoolCapacitySummary(
  pool: ExternalIpPool,
  inUseCount: number,
  allocatedCount?: number,
): string {
  const total = getExternalIpPoolTotalAddresses(pool)
  const available = getExternalIpPoolAvailableAddresses(pool, allocatedCount ?? inUseCount)

  return `${available.toLocaleString()} of ${total.toLocaleString()} available`
}

export function ExternalIpPoolHubCardIps({
  ips,
  creatingIpId = null,
}: {
  ips: readonly ExternalIp[]
  creatingIpId?: string | null
}) {
  if (ips.length === 0 && creatingIpId === null) {
    return null
  }

  return (
    <div
      className="provider-admin-catalog-items__card-footer provider-admin-external-networks-hub__card-ips"
      aria-label="IPs"
    >
      <span className="provider-admin-external-networks-hub__card-capacity-heading">IPs</span>
      <ul className="provider-admin-external-networks-hub__card-ip-list">
        {ips.map((ip) => {
          const attachmentLabel = getExternalIpAttachmentLabel(ip)

          return (
          <li key={ip.id} className="provider-admin-external-networks-hub__card-ip-item">
            {creatingIpId === ip.id ? (
              <div className="provider-admin-external-networks-hub__creating-row">
                <Spinner size="md" aria-label={`Creating ${ip.address}`} />
                <span>Creating external IP…</span>
              </div>
            ) : (
              <>
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
              </>
            )}
          </li>
          )
        })}
      </ul>
    </div>
  )
}
