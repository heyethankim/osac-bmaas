import { EnterpriseIcon } from '@patternfly/react-icons/dist/esm/icons/enterprise-icon'
import { GlobeAmericasIcon } from '@patternfly/react-icons/dist/esm/icons/globe-americas-icon'
import type { PublishCatalogScope } from '../../providerSetup/templateDemo'

type CatalogPublishScopeIconProps = {
  scope: PublishCatalogScope
  className?: string
}

export function CatalogPublishScopeIcon({ scope, className }: CatalogPublishScopeIconProps) {
  if (scope === 'vip-enterprise') {
    return <EnterpriseIcon className={className} aria-hidden />
  }

  return <GlobeAmericasIcon className={className} aria-hidden />
}
