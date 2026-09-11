import { CardBody, Content, Spinner } from '@patternfly/react-core'

type ResourceCreatingGridCardBodyProps = {
  label: string
}

export function ResourceCreatingGridCardBody({ label }: ResourceCreatingGridCardBodyProps) {
  return (
    <CardBody className="provider-admin-catalog-items__card-body--creating">
      <Spinner size="lg" aria-label={label} />
      <Content component="p" className="provider-admin-catalog-items__creating-kicker">
        {label}
      </Content>
    </CardBody>
  )
}
