import { EnterpriseIcon } from '@patternfly/react-icons/dist/esm/icons/enterprise-icon'
import { ImportIcon } from '@patternfly/react-icons/dist/esm/icons/import-icon'
import { UserIcon } from '@patternfly/react-icons/dist/esm/icons/user-icon'
import type { PublishCatalogScope } from '../providerSetup/templateDemo'
import { formatCatalogItemAddedDate } from '../catalog/catalogDetails'
import { isTenantScopedCatalogItemId } from './catalogItems'

export type TenantAdminCatalogSourceItem = {
  id: string
  scope: PublishCatalogScope
  createdAt?: string
}

export function getTenantAdminCatalogSourceLabel(item: TenantAdminCatalogSourceItem): string {
  if (isTenantScopedCatalogItemId(item.id)) {
    return 'Added by you'
  }

  if (item.scope === 'vip-enterprise') {
    return 'Assigned by provider'
  }

  return 'From provider'
}

/** Grid footer — includes a compact date when available. */
export function getTenantAdminCatalogOriginDisplay(item: TenantAdminCatalogSourceItem): string {
  const label = getTenantAdminCatalogSourceLabel(item)
  if (item.createdAt) {
    return `${label} · ${formatCatalogItemAddedDate(item.createdAt)}`
  }
  return label
}

/** List Added column — tenant-added or provider-published date. */
export function getTenantAdminCatalogAddedDate(item: TenantAdminCatalogSourceItem): string | null {
  if (item.createdAt) {
    return formatCatalogItemAddedDate(item.createdAt)
  }
  return null
}

export function getTenantAdminCatalogSourceTooltip(item: TenantAdminCatalogSourceItem): string {
  if (isTenantScopedCatalogItemId(item.id)) {
    return 'Available to members of this organization.'
  }

  if (item.scope === 'vip-enterprise') {
    return 'Your provider published this exclusively for your tenant. You decide who can launch it.'
  }

  return 'Included in your provider’s catalog.'
}

export function TenantAdminCatalogSourceIcon({
  item,
  className,
}: {
  item: TenantAdminCatalogSourceItem
  className?: string
}) {
  if (isTenantScopedCatalogItemId(item.id)) {
    return <UserIcon className={className} aria-hidden />
  }

  if (item.scope === 'vip-enterprise') {
    return <EnterpriseIcon className={className} aria-hidden />
  }

  return <ImportIcon className={className} aria-hidden />
}
