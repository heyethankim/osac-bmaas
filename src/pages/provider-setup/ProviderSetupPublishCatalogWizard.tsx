import { useEffect, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { CatalogIcon } from '@patternfly/react-icons/dist/esm/icons/catalog-icon'
import {
  Content,
  Form,
  FormGroup,
  Label,
  Modal,
  ModalVariant,
  Radio,
  Spinner,
  TextInput,
  Title,
  Wizard,
  WizardHeader,
  WizardStep,
} from '@patternfly/react-core'
import { CatalogPublishScopeIcon } from '../../components/provider-admin/CatalogPublishScopeIcon'
import {
  getHardwareProfileLabel,
  formatRateCardSummary,
  resolveRateCard,
  PUBLISH_CATALOG_STEPS,
  type PublishCatalogScope,
  type PublishedTemplatePayload,
  type SavedMasterTemplate,
} from '../../providerSetup/templateDemo'
import { getOsImageLabel } from '../../providerAdmin/osImageLabels'

type ProviderSetupPublishCatalogWizardProps = {
  isOpen: boolean
  templates: SavedMasterTemplate[]
  defaultTemplateRefId?: string
  onClose: () => void
  onCreateCatalogItem: (payload: PublishedTemplatePayload) => void
  isPublishing?: boolean
}

export function ProviderSetupPublishCatalogWizard({
  isOpen,
  templates,
  defaultTemplateRefId,
  onClose,
  onCreateCatalogItem,
  isPublishing = false,
}: ProviderSetupPublishCatalogWizardProps) {
  const [selectedTemplateRefId, setSelectedTemplateRefId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [publishScope, setPublishScope] = useState<PublishCatalogScope>('global-public')

  const selectedTemplate =
    templates.find((template) => template.templateRefId === selectedTemplateRefId) ?? null

  const resetWizard = () => {
    setSelectedTemplateRefId('')
    setDisplayName('')
    setPublishScope('global-public')
  }

  const handleClose = () => {
    resetWizard()
    onClose()
  }

  useEffect(() => {
    if (!isOpen) {
      resetWizard()
      return
    }

    const preferredTemplate =
      templates.find((template) => template.templateRefId === defaultTemplateRefId) ??
      templates[0] ??
      null

    if (preferredTemplate) {
      setSelectedTemplateRefId(preferredTemplate.templateRefId)
      setDisplayName(preferredTemplate.suggestedDisplayName)
    }
  }, [isOpen, defaultTemplateRefId, templates])

  useEffect(() => {
    if (!selectedTemplate) {
      return
    }

    setDisplayName(selectedTemplate.suggestedDisplayName)
  }, [selectedTemplate?.templateRefId])

  const handleCreateCatalogItem = () => {
    if (!selectedTemplate || !displayName.trim()) {
      return
    }

    onCreateCatalogItem({
      templateRefId: selectedTemplate.templateRefId,
      templateName: selectedTemplate.templateName,
      displayName: displayName.trim(),
      scope: publishScope,
      rateCard: resolveRateCard(selectedTemplate),
    })
  }

  function renderStepContent(stepId: (typeof PUBLISH_CATALOG_STEPS)[number]['id']) {
    switch (stepId) {
      case 'template':
        return (
          <div className="provider-setup-template__publish-template-step">
            <Content component="p" className="provider-setup-template__publish-step-lede">
              Choose the master template to link to this catalog item.
            </Content>
            <div
              className="provider-setup-template__card-group"
              role="radiogroup"
              aria-label="Master template"
            >
              {templates.map((template) => {
                const isSelected = template.templateRefId === selectedTemplateRefId

                return (
                  <button
                    key={template.templateRefId}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`provider-setup-template__select-card provider-setup-template__select-card--template${
                      isSelected ? ' provider-setup-template__select-card--selected' : ''
                    }`}
                    onClick={() => setSelectedTemplateRefId(template.templateRefId)}
                  >
                    <div className="provider-setup-template__select-card-header">
                      <Label color="green" isCompact className="provider-setup-template__select-card-badge">
                        Saved
                      </Label>
                      <span
                        className={`provider-setup-template__select-card-radio${
                          isSelected ? ' provider-setup-template__select-card-radio--selected' : ''
                        }`}
                        aria-hidden
                      />
                    </div>
                    <Title
                      headingLevel="h3"
                      size="md"
                      className="provider-setup-template__select-card-title"
                    >
                      {template.templateName}
                    </Title>
                    <Content component="p" className="provider-setup-template__select-card-detail">
                      {template.description}
                    </Content>
                    <Content component="p" className="provider-setup-template__select-card-meta">
                      <code>{template.templateRefId}</code>
                      {' · '}
                      {getHardwareProfileLabel(template.hardwareProfileId)}
                      {' · '}
                      {getOsImageLabel(template.osImageId)}
                    </Content>
                    <Content component="p" className="provider-setup-template__select-card-rate">
                      {formatRateCardSummary(resolveRateCard(template))}
                    </Content>
                  </button>
                )
              })}
            </div>
          </div>
        )
      case 'display-name':
        return (
          <Form autoComplete="off" className="provider-setup-template__publish-display-form">
            <Content component="p" className="provider-setup-template__publish-step-lede">
              This name appears in the tenant catalog when they browse available offerings.
            </Content>
            <FormGroup label="Display name for tenants" fieldId="publish-catalog-display-name" isRequired>
              <TextInput
                id="publish-catalog-display-name"
                value={displayName}
                onChange={(_event, value) => setDisplayName(value)}
                aria-label="Display name for tenants"
              />
            </FormGroup>
            {selectedTemplate ? (
              <>
                <Content component="p" className="provider-setup-template__publish-linked-template">
                  Linked template <code>{selectedTemplate.templateRefId}</code>
                </Content>
                <div className="provider-setup-template__publish-rate-card" aria-label="Inherited rate card">
                  <Content component="p" className="provider-setup-template__publish-rate-card-label">
                    Inherited rate card
                  </Content>
                  <Content component="p" className="provider-setup-template__publish-rate-card-value">
                    {formatRateCardSummary(resolveRateCard(selectedTemplate))}
                  </Content>
                  <Content component="p" className="provider-setup-template__publish-rate-card-detail">
                    Pricing is defined on the master template and cannot be changed at publish time.
                  </Content>
                </div>
              </>
            ) : null}
          </Form>
        )
      case 'publish-scope':
        return (
          <div className="provider-setup-template__publish-scope-step">
            <Content component="p" className="provider-setup-template__publish-step-lede">
              Control which tenants can discover and order this catalog item.
            </Content>
            {selectedTemplate ? (
              <div className="provider-setup-template__publish-summary">
                <Content component="p" className="provider-setup-template__publish-summary-label">
                  Commercial summary
                </Content>
                <Content component="p" className="provider-setup-template__publish-summary-value">
                  {displayName.trim() || selectedTemplate.suggestedDisplayName}
                </Content>
                <Content component="p" className="provider-setup-template__publish-summary-detail">
                  {formatRateCardSummary(resolveRateCard(selectedTemplate))}
                </Content>
              </div>
            ) : null}
            <div
              className="provider-admin-catalog__scope-options"
              role="radiogroup"
              aria-label="Publish scope"
            >
              <button
                type="button"
                className={`provider-admin-catalog__scope-card${
                  publishScope === 'global-public' ? ' provider-admin-catalog__scope-card--selected' : ''
                }`}
                onClick={() => setPublishScope('global-public')}
                role="radio"
                aria-checked={publishScope === 'global-public'}
              >
                <CatalogPublishScopeIcon
                  scope="global-public"
                  className="provider-admin-catalog__scope-icon"
                />
                <span className="provider-admin-catalog__scope-copy">
                  <span className="provider-admin-catalog__scope-title">Global public</span>
                  <span className="provider-admin-catalog__scope-detail">Visible to all tenants.</span>
                </span>
                <Radio
                  id="publish-scope-global-public"
                  name="publish-scope"
                  isChecked={publishScope === 'global-public'}
                  onChange={() => setPublishScope('global-public')}
                  aria-label="Global public"
                />
              </button>
              <button
                type="button"
                className={`provider-admin-catalog__scope-card${
                  publishScope === 'vip-enterprise' ? ' provider-admin-catalog__scope-card--selected' : ''
                }`}
                onClick={() => setPublishScope('vip-enterprise')}
                role="radio"
                aria-checked={publishScope === 'vip-enterprise'}
              >
                <CatalogPublishScopeIcon
                  scope="vip-enterprise"
                  className="provider-admin-catalog__scope-icon"
                />
                <span className="provider-admin-catalog__scope-copy">
                  <span className="provider-admin-catalog__scope-title">VIP enterprise</span>
                  <span className="provider-admin-catalog__scope-detail">Scoped to a specific tenant.</span>
                </span>
                <Radio
                  id="publish-scope-vip-enterprise"
                  name="publish-scope"
                  isChecked={publishScope === 'vip-enterprise'}
                  onChange={() => setPublishScope('vip-enterprise')}
                  aria-label="VIP enterprise"
                />
              </button>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  function getStepFooter(stepId: (typeof PUBLISH_CATALOG_STEPS)[number]['id']) {
    if (stepId === 'template') {
      return { isNextDisabled: !selectedTemplateRefId }
    }

    if (stepId === 'display-name') {
      return { isNextDisabled: !displayName.trim() }
    }

    if (stepId === 'publish-scope') {
      return {
        nextButtonText: isPublishing ? (
          <span className="provider-admin-catalog__submit-label">
            <Spinner size="sm" aria-label="Publishing catalog item" />
            <span>Publishing…</span>
          </span>
        ) : (
          <span className="provider-admin-catalog__submit-label">
            <CatalogIcon aria-hidden />
            <span>Create catalog item</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        onNext: handleCreateCatalogItem,
        isNextDisabled: isPublishing || !selectedTemplate || !displayName.trim(),
        isBackDisabled: isPublishing,
      }
    }

    return undefined
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      width="64rem"
      maxWidth="64rem"
      isOpen={isOpen}
      onEscapePress={isPublishing ? undefined : handleClose}
      aria-labelledby="publish-catalog-wizard-title"
      className="provider-setup-template__designer-modal provider-setup-template__publish-modal"
    >
      {isOpen ? (
        <Wizard
          key="publish-catalog-wizard"
          className="provider-setup-template__designer-wizard"
          height="40rem"
          onClose={isPublishing ? undefined : handleClose}
          header={
            <WizardHeader
              title="Publish to catalog"
              titleId="publish-catalog-wizard-title"
              className="provider-setup-template__designer-header"
              onClose={isPublishing ? undefined : handleClose}
              closeButtonAriaLabel="Close publish to catalog wizard"
            />
          }
        >
          {PUBLISH_CATALOG_STEPS.map((step) => (
            <WizardStep
              key={step.id}
              name={step.label}
              id={`publish-catalog-step-${step.id}`}
              footer={getStepFooter(step.id)}
            >
              {renderStepContent(step.id)}
            </WizardStep>
          ))}
        </Wizard>
      ) : null}
    </Modal>
  )
}
