import { EnterpriseIcon } from '@patternfly/react-icons/dist/esm/icons/enterprise-icon'
import { ImportIcon } from '@patternfly/react-icons/dist/esm/icons/import-icon'
import { UserIcon } from '@patternfly/react-icons/dist/esm/icons/user-icon'
import type { PublishCatalogScope } from '../providerSetup/templateDemo'
import { isTenantScopedCatalogItemId } from './catalogItems'

export type TenantAdminCatalogSourceItem = {
  id: string
  scope: PublishCatalogScope
}

export function shouldShowTenantAdminCatalogOrigin(item: TenantAdminCatalogSourceItem): boolean {
  if (isTenantScopedCatalogItemId(item.id)) {
    return true
  }

  return item.scope === 'vip-enterprise'
}

export function getTenantAdminCatalogSourceLabel(item: TenantAdminCatalogSourceItem): string {
  if (isTenantScopedCatalogItemId(item.id)) {
    return 'Added by you'
  }

  if (item.scope === 'vip-enterprise') {
    return 'Assigned by provider'
  }

  return 'Inherited offering'
}

export function getTenantAdminCatalogSourceTooltip(item: TenantAdminCatalogSourceItem): string {
  if (isTenantScopedCatalogItemId(item.id)) {
    return 'Available to members of this organization.'
  }

  if (item.scope === 'vip-enterprise') {
    return 'Your provider published this exclusively for your tenant. You decide who can launch it.'
  }

  return 'Included in your provider’s catalog. You decide who in your organization can launch it.'
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
