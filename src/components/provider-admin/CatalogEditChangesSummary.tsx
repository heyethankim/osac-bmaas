import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Title,
} from '@patternfly/react-core'
import type { EditChangeRow } from '../../shared/editChangeRow'

type CatalogEditChangesSummaryProps = {
  changes: EditChangeRow[]
  emptyMessage?: string
}

export function CatalogEditChangesSummary({
  changes,
  emptyMessage = 'No changes yet. Update a step to see a before-and-after summary here.',
}: CatalogEditChangesSummaryProps) {
  if (changes.length === 0) {
    return (
      <Content component="p" className="provider-setup-template__edit-changes-empty">
        {emptyMessage}
      </Content>
    )
  }

  return (
    <div className="provider-setup-template__edit-changes">
      <Title headingLevel="h3" size="md" className="provider-setup-template__edit-changes-title">
        Changes
      </Title>
      <DescriptionList
        isCompact
        isHorizontal
        className="provider-setup-template__edit-changes-list"
        aria-label="Catalog item changes"
      >
        {changes.map((change) => (
          <DescriptionListGroup key={change.id}>
            <DescriptionListTerm>{change.label}</DescriptionListTerm>
            <DescriptionListDescription>
              <span className="provider-setup-template__edit-change">
                <span className="provider-setup-template__edit-change-before">{change.before}</span>
                <span className="provider-setup-template__edit-change-arrow" aria-hidden>
                  →
                </span>
                <span className="provider-setup-template__edit-change-after">{change.after}</span>
              </span>
            </DescriptionListDescription>
          </DescriptionListGroup>
        ))}
      </DescriptionList>
    </div>
  )
}
