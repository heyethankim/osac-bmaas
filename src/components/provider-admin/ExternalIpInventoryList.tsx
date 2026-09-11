import { Label, Spinner } from '@patternfly/react-core'
import { ExternalIpAttachmentMeta } from './ExternalIpAttachmentMeta'
import { RelatedResourceItemActions } from './RelatedResourceItemActions'
import {
  canReleaseTenantExternalIp,
  getExternalIpStatusLabelColor,
  groupExternalIpsByStatus,
  type ExternalIp,
} from '../../providerAdmin/externalIps'
import type { TenantInstance } from '../../tenantUser/instances'

type ExternalIpInventoryListVariant = 'card' | 'nested' | 'nested-aligned' | 'details'

type ListVariantClasses = {
  list: string
  item: string
  primary: string
  meta: string
}

const LIST_VARIANT_CLASSES: Record<ExternalIpInventoryListVariant, ListVariantClasses> = {
  card: {
    list: 'provider-admin-external-networks-hub__card-ip-list',
    item: 'provider-admin-external-networks-hub__card-ip-item',
    primary: 'provider-admin-external-networks-hub__card-ip-primary',
    meta: 'provider-admin-external-networks-hub__card-ip-meta',
  },
  nested: {
    list: 'provider-admin-external-networks-hub__nested-ips-list',
    item: 'provider-admin-external-networks-hub__nested-ip-item',
    primary: 'provider-admin-external-networks-hub__ip-summary',
    meta: 'provider-admin-external-networks-hub__nested-ip-meta',
  },
  'nested-aligned': {
    list: 'provider-admin-external-networks-hub__nested-ips-status-ips-list',
    item: 'provider-admin-external-networks-hub__nested-ip-tile',
    primary: 'provider-admin-external-networks-hub__ip-summary',
    meta: 'provider-admin-external-networks-hub__nested-ip-meta',
  },
  details: {
    list: 'provider-admin-external-networks-hub__card-ip-list provider-admin-external-networks-hub__details-ip-list',
    item: 'provider-admin-external-networks-hub__card-ip-item',
    primary: 'provider-admin-external-networks-hub__card-ip-primary',
    meta: 'provider-admin-external-networks-hub__card-ip-meta',
  },
}

function ExternalIpInventoryListItem({
  ip,
  classes,
  creatingIpId,
  serviceInstances,
  onNavigateToServiceInstance,
  onReleaseExternalIp,
}: {
  ip: ExternalIp
  classes: ListVariantClasses
  creatingIpId: string | null
  serviceInstances?: readonly TenantInstance[]
  onNavigateToServiceInstance?: (instance: TenantInstance) => void
  onReleaseExternalIp?: (ip: ExternalIp) => void
}) {
  const canRelease = Boolean(onReleaseExternalIp) && canReleaseTenantExternalIp(ip)
  const isAvailableTile =
    ip.status === 'Available' &&
    classes.item === 'provider-admin-external-networks-hub__nested-ip-tile'

  return (
    <li
      className={[
        classes.item,
        isAvailableTile ? 'provider-admin-external-networks-hub__nested-ip-tile--available' : '',
        canRelease ? 'provider-admin-external-networks-hub__card-ip-item--with-actions' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {creatingIpId === ip.id ? (
        <div className="provider-admin-external-networks-hub__creating-row">
          <Spinner size="md" aria-label={`Creating ${ip.address}`} />
          <span>Creating external IP…</span>
        </div>
      ) : (
        <>
          <div className="provider-admin-external-networks-hub__card-ip-item-body">
            <div className={classes.primary}>
              <code>{ip.address}</code>
              <Label color={getExternalIpStatusLabelColor(ip.status)} isCompact>
                {ip.status}
              </Label>
            </div>
            <ExternalIpAttachmentMeta
              ip={ip}
              className={classes.meta}
              serviceInstances={serviceInstances}
              onNavigateToServiceInstance={onNavigateToServiceInstance}
            />
          </div>
          {canRelease && onReleaseExternalIp ? (
            <RelatedResourceItemActions
              resourceName={ip.address}
              onDelete={() => onReleaseExternalIp(ip)}
              deleteLabel="Release"
            />
          ) : null}
        </>
      )}
    </li>
  )
}

function ExternalIpNestedAlignedStatusRows({
  ips,
  creatingIpId,
  serviceInstances,
  onNavigateToServiceInstance,
}: {
  ips: readonly ExternalIp[]
  creatingIpId: string | null
  serviceInstances?: readonly TenantInstance[]
  onNavigateToServiceInstance?: (instance: TenantInstance) => void
}) {
  const classes = LIST_VARIANT_CLASSES['nested-aligned']
  const { inUse, available } = groupExternalIpsByStatus(ips)

  const showStatusDivider = inUse.length > 0 && available.length > 0

  const renderIpRow = (rowIps: readonly ExternalIp[], listClassName?: string) => (
    <ul
      className={[classes.list, listClassName].filter(Boolean).join(' ')}
    >
      {rowIps.map((ip) => (
        <ExternalIpInventoryListItem
          key={ip.id}
          ip={ip}
          classes={classes}
          creatingIpId={creatingIpId}
          serviceInstances={serviceInstances}
          onNavigateToServiceInstance={onNavigateToServiceInstance}
        />
      ))}
    </ul>
  )

  return (
    <div className="provider-admin-external-networks-hub__nested-ips-status-rows">
      {inUse.length > 0 ? renderIpRow(inUse) : null}
      {showStatusDivider ? (
        <div
          className="provider-admin-external-networks-hub__nested-ips-status-divider"
          role="separator"
        />
      ) : null}
      {available.length > 0
        ? renderIpRow(
            available,
            'provider-admin-external-networks-hub__nested-ips-status-ips-list--available',
          )
        : null}
    </div>
  )
}

export function ExternalIpInventoryList({
  ips,
  variant = 'card',
  creatingIpId = null,
  serviceInstances,
  onNavigateToServiceInstance,
  onReleaseExternalIp,
}: {
  ips: readonly ExternalIp[]
  variant?: ExternalIpInventoryListVariant
  creatingIpId?: string | null
  serviceInstances?: readonly TenantInstance[]
  onNavigateToServiceInstance?: (instance: TenantInstance) => void
  onReleaseExternalIp?: (ip: ExternalIp) => void
}) {
  if (variant === 'nested-aligned') {
    return (
      <ExternalIpNestedAlignedStatusRows
        ips={ips}
        creatingIpId={creatingIpId}
        serviceInstances={serviceInstances}
        onNavigateToServiceInstance={onNavigateToServiceInstance}
      />
    )
  }

  const classes = LIST_VARIANT_CLASSES[variant]

  return (
    <ul className={classes.list}>
      {ips.map((ip) => (
        <ExternalIpInventoryListItem
          key={ip.id}
          ip={ip}
          classes={classes}
          creatingIpId={creatingIpId}
          serviceInstances={serviceInstances}
          onNavigateToServiceInstance={onNavigateToServiceInstance}
          onReleaseExternalIp={onReleaseExternalIp}
        />
      ))}
    </ul>
  )
}
