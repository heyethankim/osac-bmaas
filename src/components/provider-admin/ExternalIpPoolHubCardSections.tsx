import type { ExternalIpPool } from '../../providerAdmin/externalIpPools'
import {
  getExternalIpPoolAvailableAddresses,
  getExternalIpPoolCidrs,
  getExternalIpPoolTotalAddresses,
} from '../../providerAdmin/externalIpPools'

type ExternalIpPoolHubCardSectionsProps = {
  pool: ExternalIpPool
  inUseCount: number
}

export function ExternalIpPoolHubCardSpecs({ pool }: Pick<ExternalIpPoolHubCardSectionsProps, 'pool'>) {
  const cidrs = getExternalIpPoolCidrs(pool)

  return (
    <dl className="provider-admin-catalog-items__specs-list provider-admin-external-networks-hub__card-specs">
      <div className="provider-admin-catalog-items__spec-row">
        <dt className="provider-admin-catalog-items__spec-label">Tenant</dt>
        <dd className="provider-admin-catalog-items__spec-value">
          {pool.assignedOrganizationName ?? '—'}
        </dd>
      </div>
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
}: ExternalIpPoolHubCardSectionsProps) {
  const total = getExternalIpPoolTotalAddresses(pool)
  const available = getExternalIpPoolAvailableAddresses(pool, inUseCount)
  const inUse = Math.max(total - available, 0)

  return (
    <div className="provider-admin-catalog-items__card-footer provider-admin-external-networks-hub__card-capacity">
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
): string {
  const total = getExternalIpPoolTotalAddresses(pool)
  const available = getExternalIpPoolAvailableAddresses(pool, inUseCount)

  return `${available.toLocaleString()} of ${total.toLocaleString()} available`
}
