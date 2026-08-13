import type { ReactNode } from 'react'
import { Icon, Label } from '@patternfly/react-core'
import { RedhatIcon } from '@patternfly/react-icons/dist/esm/icons/redhat-icon'
import type { CatalogSpecRow } from '../../catalog/catalogSpecs'
import {
  getCatalogClusterVersionModeLabel,
  resolveCatalogClusterVersionMode,
  type CatalogClusterVersionMode,
} from '../../catalog/catalogPublishConfig'

type CatalogClusterVersionValueProps = {
  children: ReactNode
  /** Optional Locked / Editable chip from catalog policy. */
  badge?: CatalogSpecRow['badge']
  /** Alternate to `badge` when only the mode is known. Defaults to locked. */
  mode?: CatalogClusterVersionMode
}

/** Cluster version value with a small Red Hat mark and Locked / Editable chip. */
export function CatalogClusterVersionValue({
  children,
  badge,
  mode,
}: CatalogClusterVersionValueProps) {
  const resolvedMode = resolveCatalogClusterVersionMode(mode)
  const resolvedBadge = badge ?? {
    text: getCatalogClusterVersionModeLabel(resolvedMode),
    color: resolvedMode === 'editable' ? 'blue' : 'grey',
  }

  return (
    <span className="catalog-cluster-version-value">
      <Icon size="sm" className="catalog-cluster-version-value__icon">
        <RedhatIcon aria-hidden />
      </Icon>
      <span>{children}</span>
      <Label color={resolvedBadge.color} isCompact>
        {resolvedBadge.text}
      </Label>
    </span>
  )
}
