import { useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  Content,
  Flex,
  FlexItem,
  Icon,
  Label,
  List,
  ListComponent,
  ListItem,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import { AngleRightIcon } from '@patternfly/react-icons/dist/esm/icons/angle-right-icon'
import {
  DEFAULT_PROVIDER_SERVICE_SELECTION,
  PROVIDER_SERVICE_CHIP_LABELS,
  PROVIDER_SERVICE_OFFERINGS,
  type ProviderServiceId,
} from '../../providerSetup/constants'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'

type ProviderServiceSelectionPageProps = {
  initialSelectedServices?: ProviderServiceId[]
  onContinue: (selectedServices: ProviderServiceId[]) => void
}

function getContinueLabel(count: number): string {
  if (count === 1) {
    return 'Continue with 1 service'
  }

  return `Continue with ${count} services`
}

export function ProviderServiceSelectionPage({
  initialSelectedServices,
  onContinue,
}: ProviderServiceSelectionPageProps) {
  const [selectedServices, setSelectedServices] = useState<Set<ProviderServiceId>>(() => {
    const initial =
      initialSelectedServices && initialSelectedServices.length > 0
        ? initialSelectedServices
        : DEFAULT_PROVIDER_SERVICE_SELECTION
    return new Set(initial)
  })

  const selectedCount = selectedServices.size
  const selectedServiceIds = PROVIDER_SERVICE_OFFERINGS.filter((service) =>
    selectedServices.has(service.id),
  ).map((service) => service.id)

  const handleToggle = (serviceId: ProviderServiceId) => {
    setSelectedServices((current) => {
      const next = new Set(current)
      if (next.has(serviceId)) {
        next.delete(serviceId)
      } else {
        next.add(serviceId)
      }
      return next
    })
  }

  const handleContinue = () => {
    if (selectedCount === 0) {
      return
    }

    onContinue([...selectedServices])
  }

  return (
    <Stack hasGutter className="provider-service-selection">
      <StackItem className="provider-service-selection__intro">
        <Label color="blue">First-time setup</Label>
        <Title headingLevel="h1" size="3xl">
          Welcome—what services will you offer to tenants?
        </Title>
      </StackItem>

      <StackItem>
        <Flex
          className="provider-service-selection__summary"
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentFlexEnd' }}
          gap={{ default: 'gapSm' }}
        >
          {selectedCount > 0 ? (
            <>
              <FlexItem>
                <span className="provider-service-selection__summary-label">Selected</span>
              </FlexItem>
              {selectedServiceIds.map((serviceId) => (
                <FlexItem key={serviceId}>
                  <Label color="grey" isCompact>
                    {PROVIDER_SERVICE_CHIP_LABELS[serviceId]}
                  </Label>
                </FlexItem>
              ))}
            </>
          ) : (
            <FlexItem>
              <span className="provider-service-selection__summary-empty">
                Select at least one service to continue
              </span>
            </FlexItem>
          )}
        </Flex>
      </StackItem>

      <StackItem>
        <div className="provider-service-selection__cards">
          {PROVIDER_SERVICE_OFFERINGS.map((service) => {
            const isSelected = selectedServices.has(service.id)
            const titleId = `provider-service-${service.id}-title`

            return (
              <Card
                key={service.id}
                isCompact={false}
                isSelectable
                isSelected={isSelected}
                className="provider-service-selection__card"
                aria-labelledby={titleId}
                onClick={() => handleToggle(service.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    handleToggle(service.id)
                  }
                }}
              >
                <CardBody className="provider-service-selection__card-body">
                  {isSelected ? (
                    <Label color="grey" isCompact className="provider-service-selection__card-badge">
                      Selected
                    </Label>
                  ) : null}
                  <div className="provider-service-selection__icon-wrap">
                    <Icon size="lg">{getCatalogServiceIcon(service.id)}</Icon>
                  </div>
                  <Title
                    id={titleId}
                    headingLevel="h2"
                    size="lg"
                    className="provider-service-selection__card-title"
                  >
                    {service.title}
                  </Title>
                  <Content component="p" className="provider-service-selection__card-description">
                    {service.description}
                  </Content>
                  <List component={ListComponent.ul} className="provider-service-selection__feature-list">
                    {service.features.map((feature) => (
                      <ListItem key={feature}>{feature}</ListItem>
                    ))}
                  </List>
                </CardBody>
              </Card>
            )
          })}
        </div>
      </StackItem>

      <StackItem className="provider-service-selection__footer">
        <Button
          variant="primary"
          icon={<AngleRightIcon />}
          iconPosition="end"
          onClick={handleContinue}
          isDisabled={selectedCount === 0}
        >
          {selectedCount === 0 ? 'Continue' : getContinueLabel(selectedCount)}
        </Button>
        <Content component="p" className="provider-service-selection__footer-note">
          Services can be added or disabled at any time from Settings.
        </Content>
      </StackItem>
    </Stack>
  )
}
