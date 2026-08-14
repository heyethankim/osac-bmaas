import { Content } from '@patternfly/react-core'

type CatalogEditPreviousValueProps = {
  previous?: string | null
}

export function CatalogEditPreviousValue({ previous }: CatalogEditPreviousValueProps) {
  if (!previous) {
    return null
  }

  return (
    <Content component="p" className="provider-setup-template__edit-previous-value">
      Previously: <span>{previous}</span>
    </Content>
  )
}
