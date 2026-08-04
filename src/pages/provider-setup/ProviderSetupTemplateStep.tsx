import { useMemo, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { ShoppingCartIcon } from '@patternfly/react-icons/dist/esm/icons/shopping-cart-icon'
import {
  Button,
  Card,
  CardBody,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Grid,
  GridItem,
  Label,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core'
import {
  DISCOVERED_HARDWARE_PROFILES,
  DISCOVERED_HARDWARE_TOTALS,
  type PublishedTemplatePayload,
  type SavedMasterTemplate,
} from '../../providerSetup/templateDemo'
import {
  getProviderRegisteredOrganizations,
  getProviderSavedTemplate,
  setProviderSavedTemplate,
} from '../../providerSetup/storage'
import { ProviderSetupBlueprintDesigner } from './ProviderSetupBlueprintDesigner'
import { ProviderSetupPublishCatalogWizard } from './ProviderSetupPublishCatalogWizard'

type ProviderSetupTemplateStepProps = {
  onCreateCatalogItem: (payload: PublishedTemplatePayload) => void
  isPublishing?: boolean
}

function mergeTemplates(
  savedTemplate: SavedMasterTemplate | null,
  userSavedTemplate: SavedMasterTemplate | null,
): SavedMasterTemplate[] {
  const templates: SavedMasterTemplate[] = []
  const seen = new Set<string>()

  for (const template of [userSavedTemplate, savedTemplate]) {
    if (!template || seen.has(template.templateRefId)) {
      continue
    }

    seen.add(template.templateRefId)
    templates.push(template)
  }

  return templates
}

export function ProviderSetupTemplateStep({
  onCreateCatalogItem,
  isPublishing = false,
}: ProviderSetupTemplateStepProps) {
  const [isDesignerOpen, setIsDesignerOpen] = useState(false)
  const [isPublishWizardOpen, setIsPublishWizardOpen] = useState(false)
  const [userSavedTemplate, setUserSavedTemplate] = useState<SavedMasterTemplate | null>(
    () => getProviderSavedTemplate(),
  )

  const blueprintSaved = userSavedTemplate !== null
  const availableTemplates = useMemo(
    () => mergeTemplates(getProviderSavedTemplate(), userSavedTemplate),
    [userSavedTemplate],
  )

  const handleTemplateSaved = (template: SavedMasterTemplate) => {
    setProviderSavedTemplate(template)
    setUserSavedTemplate(template)
    setIsDesignerOpen(false)
  }

  const handleOpenPublishWizard = () => {
    if (!blueprintSaved) {
      return
    }

    setIsDesignerOpen(false)
    setIsPublishWizardOpen(true)
  }

  return (
    <>
      <Stack hasGutter>
        <StackItem>
          <Grid hasGutter className="provider-setup-template">
            <GridItem span={12} md={6} className="provider-setup-template__panel-col">
              <Card className="provider-setup-template__panel-card">
                <CardBody>
                  <Stack hasGutter>
                    <StackItem>
                      <Title headingLevel="h2" size="lg">
                        Discovered hardware profiles
                      </Title>
                      <Content component="p" className="provider-setup-template__inventory-lede">
                        Grouped by model, these profiles become selectable recipes in the template creator.
                      </Content>
                    </StackItem>
                    <StackItem className="provider-setup-template__inventory">
                      <div className="provider-setup-template__inventory-details">
                        {DISCOVERED_HARDWARE_PROFILES.map((profile, index) => (
                          <div key={profile.id}>
                            {index > 0 ? (
                              <Divider className="provider-setup-template__inventory-divider" />
                            ) : null}
                            <div className="provider-setup-template__inventory-row">
                              <Content component="p" className="provider-setup-template__profile-name">
                                {profile.hostCount}× {profile.vendor} {profile.model}
                              </Content>
                              <DescriptionList
                                isCompact
                                isHorizontal
                                className="provider-setup-template__profile-specs"
                              >
                                <DescriptionListGroup>
                                  <DescriptionListTerm>CPU</DescriptionListTerm>
                                  <DescriptionListDescription>{profile.cpu}</DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                  <DescriptionListTerm>RAM</DescriptionListTerm>
                                  <DescriptionListDescription>{profile.memory}</DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                  <DescriptionListTerm>GPU</DescriptionListTerm>
                                  <DescriptionListDescription>{profile.gpu}</DescriptionListDescription>
                                </DescriptionListGroup>
                              </DescriptionList>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="provider-setup-template__totals">
                        <Content component="p" className="provider-setup-template__totals-summary">
                          <span className="provider-setup-template__totals-stat">
                            <span className="provider-setup-template__totals-value">
                              {DISCOVERED_HARDWARE_TOTALS.hostCount}
                            </span>
                            <span className="provider-setup-template__totals-label">Total hosts</span>
                          </span>
                          <span className="provider-setup-template__totals-stat">
                            <span className="provider-setup-template__totals-value">
                              {DISCOVERED_HARDWARE_TOTALS.vcpus}
                            </span>
                            <span className="provider-setup-template__totals-label">Total vCPUs</span>
                          </span>
                          <span className="provider-setup-template__totals-stat">
                            <span className="provider-setup-template__totals-value">
                              {DISCOVERED_HARDWARE_TOTALS.memoryTb}
                            </span>
                            <span className="provider-setup-template__totals-label">Total RAM</span>
                          </span>
                        </Content>
                      </div>
                    </StackItem>
                  </Stack>
                </CardBody>
              </Card>
            </GridItem>

            <GridItem span={12} md={6} className="provider-setup-template__panel-col">
              <Card className="provider-setup-template__panel-card provider-setup-template__panel-card--next-step">
                <CardBody>
                  <Stack hasGutter className="provider-setup-template__workflow-steps">
                    <StackItem>
                      <Label color="blue">Next step</Label>
                    </StackItem>
                    <StackItem>
                      <section
                        className="provider-setup-template__workflow-step"
                        aria-labelledby="template-workflow-step-1-title"
                      >
                        <div className="provider-setup-template__workflow-step-header">
                          <span className="provider-setup-template__workflow-step-number" aria-hidden>
                            1
                          </span>
                          <div className="provider-setup-template__workflow-step-heading">
                            <Title headingLevel="h2" size="lg" id="template-workflow-step-1-title">
                              Create first master template
                            </Title>
                          </div>
                          {blueprintSaved ? (
                            <Label
                              color="green"
                              isCompact
                              className="provider-setup-template__workflow-step-status"
                            >
                              Complete
                            </Label>
                          ) : null}
                        </div>
                        <Content component="p" className="provider-setup-template__next-step-copy">
                          Author a private hardware recipe to establish your back-office master blueprint.
                        </Content>
                        <Button
                          variant="primary"
                          className="provider-setup-template__workflow-action"
                          onClick={() => setIsDesignerOpen(true)}
                        >
                          {blueprintSaved ? 'Reopen template creator' : 'Open template creator'}
                        </Button>
                      </section>
                    </StackItem>

                    <StackItem>
                      <Divider className="provider-setup-template__workflow-divider" />
                    </StackItem>

                    <StackItem>
                      <section
                        className={`provider-setup-template__workflow-step${
                          blueprintSaved ? '' : ' provider-setup-template__workflow-step--upcoming'
                        }`}
                        aria-labelledby="template-workflow-step-2-title"
                      >
                        <div className="provider-setup-template__workflow-step-header">
                          <span className="provider-setup-template__workflow-step-number" aria-hidden>
                            2
                          </span>
                          <div className="provider-setup-template__workflow-step-heading">
                            <Title headingLevel="h2" size="lg" id="template-workflow-step-2-title">
                              Create a catalog item
                            </Title>
                            {blueprintSaved ? (
                              <Label color="blue" isCompact>
                                Ready
                              </Label>
                            ) : null}
                          </div>
                        </div>
                        <Content component="p" className="provider-setup-template__next-step-copy">
                          After the master template is saved, create a catalog item from it. Items start
                          unpublished until you publish them for tenants to discover and order.
                        </Content>
                        <Button
                          variant="primary"
                          isDisabled={!blueprintSaved || isPublishing}
                          aria-label="Create catalog item"
                          className="provider-setup-template__workflow-action provider-setup-template__publish-preview-button"
                          onClick={handleOpenPublishWizard}
                        >
                          <span className="provider-setup-template__publish-preview-label">
                            <ShoppingCartIcon aria-hidden />
                            <span>Create catalog item</span>
                            <ArrowRightIcon aria-hidden />
                          </span>
                        </Button>
                      </section>
                    </StackItem>
                  </Stack>
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        </StackItem>
      </Stack>

      <ProviderSetupBlueprintDesigner
        isOpen={isDesignerOpen}
        onClose={() => setIsDesignerOpen(false)}
        onTemplateSaved={handleTemplateSaved}
      />

      <ProviderSetupPublishCatalogWizard
        isOpen={isPublishWizardOpen}
        templates={availableTemplates}
        organizations={getProviderRegisteredOrganizations()}
        defaultTemplateRefId={userSavedTemplate?.templateRefId}
        onClose={() => setIsPublishWizardOpen(false)}
        onCreateCatalogItem={(payload) => {
          setIsPublishWizardOpen(false)
          onCreateCatalogItem(payload)
        }}
        isPublishing={isPublishing}
      />
    </>
  )
}
