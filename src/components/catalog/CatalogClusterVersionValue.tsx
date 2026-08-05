import type { ReactNode } from 'react'
import { Icon } from '@patternfly/react-core'
import { RedhatIcon } from '@patternfly/react-icons/dist/esm/icons/redhat-icon'

type CatalogClusterVersionValueProps = {
  children: ReactNode
}

/** Cluster version value with a small Red Hat mark for OpenShift offerings. */
export function CatalogClusterVersionValue({ children }: CatalogClusterVersionValueProps) {
  return (
    <span className="catalog-cluster-version-value">
      <Icon size="sm" className="catalog-cluster-version-value__icon">
        <RedhatIcon aria-hidden />
      </Icon>
      <span>{children}</span>
    </span>
  )
}
