import { GlobeAmericasIcon } from '@patternfly/react-icons/dist/esm/icons/globe-americas-icon'
import { RhUiEnterpriseIcon } from '@patternfly/react-icons/dist/esm/icons/rh-ui-enterprise-icon'
import type { PublishCatalogScope } from '../../providerSetup/templateDemo'

type CatalogPublishScopeIconProps = {
  scope: PublishCatalogScope
  className?: string
}

export function CatalogPublishScopeIcon({ scope, className }: CatalogPublishScopeIconProps) {
  if (scope === 'vip-enterprise') {
    return <RhUiEnterpriseIcon className={className} aria-hidden />
  }

  return <GlobeAmericasIcon className={className} aria-hidden />
}
