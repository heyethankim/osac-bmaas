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
  /** Alternate to `badge` when only the mode is known. */
  mode?: CatalogClusterVersionMode
}

/** Cluster version value with a small Red Hat mark; Locked / Editable chip only when policy is set. */
export function CatalogClusterVersionValue({
  children,
  badge,
  mode,
}: CatalogClusterVersionValueProps) {
  const resolvedMode = mode === undefined ? undefined : resolveCatalogClusterVersionMode(mode)
  const resolvedBadge =
    badge ??
    (resolvedMode === undefined
      ? undefined
      : {
          text: getCatalogClusterVersionModeLabel(resolvedMode),
          color: (resolvedMode === 'editable' ? 'purple' : 'grey') as 'purple' | 'grey',
        })

  return (
    <span className="catalog-cluster-version-value">
      <Icon size="sm" className="catalog-cluster-version-value__icon">
        <RedhatIcon aria-hidden />
      </Icon>
      <span>{children}</span>
      {resolvedBadge ? (
        <Label color={resolvedBadge.color} isCompact>
          {resolvedBadge.text}
        </Label>
      ) : null}
    </span>
  )
}
