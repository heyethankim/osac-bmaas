import type { ReactNode } from 'react'
import { Icon } from '@patternfly/react-core'
import { RedhatIcon } from '@patternfly/react-icons/dist/esm/icons/redhat-icon'
import { isRedHatBrandedDiskImageLabel } from '../../catalog/catalogPublishConfig'

type CatalogDiskImageValueProps = {
  children: ReactNode
}

/** Disk image value with a small Red Hat mark for RHEL offerings. */
export function CatalogDiskImageValue({ children }: CatalogDiskImageValueProps) {
  const label = String(children).trim()
  if (!isRedHatBrandedDiskImageLabel(label)) {
    return <>{children}</>
  }

  return (
    <span className="catalog-cluster-version-value">
      <Icon size="sm" className="catalog-cluster-version-value__icon">
        <RedhatIcon aria-hidden />
      </Icon>
      <span>{children}</span>
    </span>
  )
}
