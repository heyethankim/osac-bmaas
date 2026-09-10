import type { ReactNode } from 'react'
import { Content } from '@patternfly/react-core'
import { CatalogEditChangesSummary } from '../components/provider-admin/CatalogEditChangesSummary'
import type { EditChangeRow } from '../shared/editChangeRow'

type NetworkInventoryEditReviewPanelProps = {
  isEditMode: boolean
  editChanges: EditChangeRow[]
  createReview: ReactNode
  ariaLabel?: string
}

export function NetworkInventoryEditReviewPanel({
  isEditMode,
  editChanges,
  createReview,
  ariaLabel = 'Resource changes',
}: NetworkInventoryEditReviewPanelProps) {
  if (!isEditMode) {
    return createReview
  }

  return (
    <div className="provider-admin-network-inventory__wizard-step">
      <Content component="p" className="provider-admin-network-inventory__wizard-lede">
        Review your changes before saving.
      </Content>
      <CatalogEditChangesSummary changes={editChanges} ariaLabel={ariaLabel} />
    </div>
  )
}
