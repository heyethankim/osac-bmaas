import { CatalogIcon } from '@patternfly/react-icons/dist/esm/icons/catalog-icon'
import { EnterpriseIcon } from '@patternfly/react-icons/dist/esm/icons/enterprise-icon'
import { ImportIcon } from '@patternfly/react-icons/dist/esm/icons/import-icon'
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
    return 'Created by you'
  }

  if (item.scope === 'vip-enterprise') {
    return 'Assigned by provider'
  }

  return 'Inherited offering'
}

export function getTenantAdminCatalogSourceTooltip(item: TenantAdminCatalogSourceItem): string {
  if (isTenantScopedCatalogItemId(item.id)) {
    return 'Added by you for members of this organization.'
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
    return <CatalogIcon set="rh-ui" className={className} aria-hidden />
  }

  if (item.scope === 'vip-enterprise') {
    return <EnterpriseIcon className={className} aria-hidden />
  }

  return <ImportIcon className={className} aria-hidden />
}
