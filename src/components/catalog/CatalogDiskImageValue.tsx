import type { ReactNode } from 'react'
import { Icon, Label } from '@patternfly/react-core'
import { RedhatIcon } from '@patternfly/react-icons/dist/esm/icons/redhat-icon'
import type { CatalogSpecRow } from '../../catalog/catalogSpecs'
import { isRedHatBrandedDiskImageLabel } from '../../catalog/catalogPublishConfig'

type CatalogDiskImageValueProps = {
  children: ReactNode
  /** Optional Locked / Editable chip from catalog policy. */
  badge?: CatalogSpecRow['badge']
}

/** Disk image value with a small Red Hat mark for RHEL offerings. */
export function CatalogDiskImageValue({ children, badge }: CatalogDiskImageValueProps) {
  const label = String(children).trim()
  const branded = isRedHatBrandedDiskImageLabel(label)

  if (!branded && !badge) {
    return <>{children}</>
  }

  return (
    <span className="catalog-cluster-version-value">
      {branded ? (
        <Icon size="sm" className="catalog-cluster-version-value__icon">
          <RedhatIcon aria-hidden />
        </Icon>
      ) : null}
      <span>{children}</span>
      {badge ? (
        <Label color={badge.color} isCompact>
          {badge.text}
        </Label>
      ) : null}
    </span>
  )
}
