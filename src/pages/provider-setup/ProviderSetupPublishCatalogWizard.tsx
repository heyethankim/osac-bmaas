import { useEffect, useMemo, useState } from 'react'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { CatalogIcon } from '@patternfly/react-icons/dist/esm/icons/catalog-icon'
import {
  Alert,
  Card,
  CardBody,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Form,
  FormGroup,
  Icon,
  Label,
  Modal,
  ModalVariant,
  Radio,
  Spinner,
  TextArea,
  TextInput,
  Title,
  Wizard,
  WizardHeader,
  WizardStep,
} from '@patternfly/react-core'
import { CatalogPublishScopeIcon } from '../../components/provider-admin/CatalogPublishScopeIcon'
import {
  formatVipEnterpriseVisibilityLabel,
  VipEnterpriseOrganizationField,
} from '../../components/provider-admin/VipEnterpriseOrganizationField'
import { CatalogHardwareSpecsList } from '../../components/catalog/CatalogHardwareSpecsList'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import { resolveHardwareSpecsFromTemplate } from '../../catalog/hardwareSpecs'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import {
  CATALOG_SERVICE_OFFERINGS,
  getCatalogServiceOffering,
  formatRateCardSummary,
  resolveRateCard,
  PUBLISH_CATALOG_STEPS,
  type CatalogServiceId,
  type PublishCatalogScope,
  type PublishedTemplatePayload,
  type SavedMasterTemplate,
} from '../../providerSetup/templateDemo'

type ProviderSetupPublishCatalogWizardProps = {
  isOpen: boolean
  templates: SavedMasterTemplate[]
  organizations: RegisteredOrganization[]
  defaultTemplateRefId?: string
  /** When set, prefills the Name step instead of the template suggested name. */
  defaultDisplayName?: string
  /** Resume VIP after registering an organization. */
  initialPublishScope?: PublishCatalogScope
  initialEnterpriseTenantId?: string
  onClose: () => void
  onCreateCatalogItem: (payload: PublishedTemplatePayload) => void
  onRegisterOrganization?: () => void
  isPublishing?: boolean
}

export function ProviderSetupPublishCatalogWizard({
  isOpen,
  templates,
  organizations,
  defaultTemplateRefId,
  defaultDisplayName,
  initialPublishScope = 'global-public',
  initialEnterpriseTenantId = '',
  onClose,
  onCreateCatalogItem,
  onRegisterOrganization,
  isPublishing = false,
}: ProviderSetupPublishCatalogWizardProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<CatalogServiceId | null>(null)
  const [selectedTemplateRefId, setSelectedTemplateRefId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [description, setDescription] = useState('')
  const [publishScope, setPublishScope] = useState<PublishCatalogScope>('global-public')
  const [enterpriseTenantId, setEnterpriseTenantId] = useState('')

  const selectedTemplate =
    templates.find((template) => template.templateRefId === selectedTemplateRefId) ?? null
  const isVipEnterprise = publishScope === 'vip-enterprise'
  const selectedVipOrganization = useMemo(
    () => organizations.find((organization) => organization.tenantId === enterpriseTenantId) ?? null,
    [organizations, enterpriseTenantId],
  )
  const isVipUnassigned = isVipEnterprise && !enterpriseTenantId.trim()
  const canCreateCatalogItem =
    Boolean(selectedServiceId) && Boolean(selectedTemplate) && Boolean(displayName.trim())

  const selectVipEnterprise = () => {
    setPublishScope('vip-enterprise')
    setEnterpriseTenantId((current) => {
      if (current.trim() && organizations.some((organization) => organization.tenantId === current)) {
        return current
      }
      return organizations[0]?.tenantId ?? ''
    })
  }

  const resetWizard = () => {
    setSelectedServiceId(null)
    setSelectedTemplateRefId('')
    setDisplayName('')
    setDescription('')
    setPublishScope('global-public')
    setEnterpriseTenantId('')
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
      setDisplayName(defaultDisplayName ?? preferredTemplate.suggestedDisplayName)
      setDescription(preferredTemplate.description)
    }

    setPublishScope(initialPublishScope)
    if (initialPublishScope === 'vip-enterprise') {
      const preferredTenantId =
        initialEnterpriseTenantId &&
        organizations.some((organization) => organization.tenantId === initialEnterpriseTenantId)
          ? initialEnterpriseTenantId
          : (organizations[0]?.tenantId ?? '')
      setEnterpriseTenantId(preferredTenantId)
    } else {
      setEnterpriseTenantId('')
    }
    // Initialize only when the wizard opens; resume props are read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-only init
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || publishScope !== 'vip-enterprise' || enterpriseTenantId.trim()) {
      return
    }

    const firstOrganization = organizations[0]
    if (firstOrganization) {
      setEnterpriseTenantId(firstOrganization.tenantId)
    }
  }, [isOpen, organizations, publishScope, enterpriseTenantId])

  useEffect(() => {
    if (!selectedTemplate) {
      return
    }

    setDisplayName(defaultDisplayName ?? selectedTemplate.suggestedDisplayName)
    setDescription(selectedTemplate.description)
  }, [selectedTemplate?.templateRefId, defaultDisplayName])

  const handleCreateCatalogItem = () => {
    if (!canCreateCatalogItem || !selectedServiceId || !selectedTemplate) {
      return
    }

    onCreateCatalogItem({
      serviceId: selectedServiceId,
      templateRefId: selectedTemplate.templateRefId,
      templateName: selectedTemplate.templateName,
      displayName: displayName.trim(),
      description: description.trim(),
      scope: publishScope,
      rateCard: resolveRateCard(selectedTemplate),
      status: 'unpublished',
      ...(isVipEnterprise && enterpriseTenantId.trim()
        ? { enterpriseTenantId: enterpriseTenantId.trim() }
        : {}),
      ...(selectedVipOrganization ? { vipOrganizationId: selectedVipOrganization.id } : {}),
    })
  }

  function renderStepContent(stepId: (typeof PUBLISH_CATALOG_STEPS)[number]['id']) {
    switch (stepId) {
      case 'service':
        return (
          <div className="provider-setup-template__publish-service-step">
            <Content component="p" className="provider-setup-template__publish-step-lede">
              Choose the service this catalog item belongs to.
            </Content>
            <div
              className="provider-setup-template__service-cards"
              role="radiogroup"
              aria-label="Catalog service"
            >
              {CATALOG_SERVICE_OFFERINGS.map((service) => {
                const isSelected = selectedServiceId === service.id
                const titleId = `publish-catalog-service-${service.id}-title`

                return (
                  <Card
                    key={service.id}
                    isSelectable
                    isSelected={isSelected}
                    className="provider-setup-template__service-card"
                    aria-labelledby={titleId}
                    onClick={() => setSelectedServiceId(service.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedServiceId(service.id)
                      }
                    }}
                  >
                    <CardBody className="provider-setup-template__service-card-body">
                      {isSelected ? (
                        <Label
                          color="grey"
                          isCompact
                          className="provider-setup-template__service-card-badge"
                        >
                          Selected
                        </Label>
                      ) : null}
                      <div className="provider-setup-template__service-card-icon-wrap">
                        <Icon size="lg">{getCatalogServiceIcon(service.id)}</Icon>
                      </div>
                      <Title
                        id={titleId}
                        headingLevel="h3"
                        size="md"
                        className="provider-setup-template__service-card-title"
                      >
                        {service.title}
                      </Title>
                      <Content
                        component="p"
                        className="provider-setup-template__service-card-description"
                      >
                        {service.description}
                      </Content>
                    </CardBody>
                  </Card>
                )
              })}
            </div>
          </div>
        )
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
                const hardwareSpecs = resolveHardwareSpecsFromTemplate(template)

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
                    <CatalogHardwareSpecsList
                      specs={hardwareSpecs}
                      className="provider-setup-template__select-card-specs"
                    />
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
          <div className="provider-setup-template__publish-display-step">
            <Content component="p" className="provider-setup-template__publish-step-lede">
              This name appears in the tenant catalog when they browse available offerings.
            </Content>
            <Form autoComplete="off" className="provider-setup-template__publish-display-form">
              <FormGroup label="Name" fieldId="publish-catalog-display-name" isRequired>
                <TextInput
                  id="publish-catalog-display-name"
                  value={displayName}
                  onChange={(_event, value) => setDisplayName(value)}
                  aria-label="Name"
                />
              </FormGroup>
              <FormGroup label="Description" fieldId="publish-catalog-description">
                <TextArea
                  id="publish-catalog-description"
                  value={description}
                  onChange={(_event, value) => setDescription(value)}
                  aria-label="Description"
                  rows={3}
                />
              </FormGroup>
            </Form>
          </div>
        )
      case 'publish-scope':
        return (
          <div className="provider-setup-template__publish-scope-step">
            <Content component="p" className="provider-setup-template__publish-step-lede">
              Control which tenants can discover and order this catalog item.
            </Content>
            <div
              className="provider-admin-catalog__scope-options"
              role="radiogroup"
              aria-label="Visibility"
            >
              <button
                type="button"
                className={`provider-admin-catalog__scope-card${
                  publishScope === 'global-public' ? ' provider-admin-catalog__scope-card--selected' : ''
                }`}
                onClick={() => {
                  setPublishScope('global-public')
                  setEnterpriseTenantId('')
                }}
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
                  onChange={() => {
                    setPublishScope('global-public')
                    setEnterpriseTenantId('')
                  }}
                  aria-label="Global public"
                />
              </button>
              <button
                type="button"
                className={`provider-admin-catalog__scope-card${
                  publishScope === 'vip-enterprise' ? ' provider-admin-catalog__scope-card--selected' : ''
                }`}
                onClick={selectVipEnterprise}
                role="radio"
                aria-checked={publishScope === 'vip-enterprise'}
              >
                <CatalogPublishScopeIcon
                  scope="vip-enterprise"
                  className="provider-admin-catalog__scope-icon"
                />
                <span className="provider-admin-catalog__scope-copy">
                  <span className="provider-admin-catalog__scope-title">VIP enterprise</span>
                  <span className="provider-admin-catalog__scope-detail">
                    Visible only to a specific enterprise tenant.
                  </span>
                </span>
                <Radio
                  id="publish-scope-vip-enterprise"
                  name="publish-scope"
                  isChecked={publishScope === 'vip-enterprise'}
                  onChange={selectVipEnterprise}
                  aria-label="VIP enterprise"
                />
              </button>
            </div>
            {isVipEnterprise ? (
              <div className="provider-setup-template__publish-enterprise-form">
                <VipEnterpriseOrganizationField
                  organizations={organizations}
                  selectedTenantId={enterpriseTenantId}
                  onSelectedTenantIdChange={setEnterpriseTenantId}
                  onRegisterOrganization={onRegisterOrganization}
                  fieldIdPrefix="publish-catalog"
                />
              </div>
            ) : null}
          </div>
        )
      case 'review': {
        const reviewHardwareSpecs = selectedTemplate
          ? resolveHardwareSpecsFromTemplate(selectedTemplate)
          : null

        return (
          <div className="provider-setup-template__publish-review-step">
            <Content component="p" className="provider-setup-template__publish-step-lede">
              Confirm the catalog item details before publishing.
            </Content>
            {selectedTemplate ? (
              <Alert
                variant="info"
                isInline
                title="Inherited pricing"
                className="provider-setup-template__publish-review-alert"
              >
                <Content component="p">
                  This catalog item will publish with{' '}
                  <strong>{formatRateCardSummary(resolveRateCard(selectedTemplate))}</strong> from
                  the master template. Pricing cannot be changed at publish time.
                </Content>
              </Alert>
            ) : null}
            <DescriptionList
              isCompact
              className="provider-setup-template__publish-review-list"
              aria-label="Catalog item review"
            >
              <DescriptionListGroup>
                <DescriptionListTerm>Service</DescriptionListTerm>
                <DescriptionListDescription>
                  {selectedServiceId
                    ? getCatalogServiceOffering(selectedServiceId).title
                    : '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Template</DescriptionListTerm>
                <DescriptionListDescription>
                  {selectedTemplate?.templateName ?? '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              {reviewHardwareSpecs ? (
                <>
                  <DescriptionListGroup>
                    <DescriptionListTerm>CPU</DescriptionListTerm>
                    <DescriptionListDescription>{reviewHardwareSpecs.cpu}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>RAM</DescriptionListTerm>
                    <DescriptionListDescription>{reviewHardwareSpecs.ram}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>GPU</DescriptionListTerm>
                    <DescriptionListDescription>{reviewHardwareSpecs.gpu}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>OS image</DescriptionListTerm>
                    <DescriptionListDescription>
                      {reviewHardwareSpecs.osImage}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </>
              ) : null}
              <DescriptionListGroup>
                <DescriptionListTerm>Name</DescriptionListTerm>
                <DescriptionListDescription>
                  {displayName.trim() || '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Description</DescriptionListTerm>
                <DescriptionListDescription>
                  {description.trim() || '—'}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Visibility</DescriptionListTerm>
                <DescriptionListDescription>
                  {isVipEnterprise
                    ? formatVipEnterpriseVisibilityLabel(organizations, enterpriseTenantId)
                    : 'Global public'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
            <Alert
              variant="info"
              isInline
              title="Starts as unpublished"
              className="provider-setup-template__publish-review-alert"
            >
              <Content component="p">
                {isVipUnassigned
                  ? 'VIP enterprise is selected without a target organization. The catalog item will be saved as unpublished until you register or assign a tenant, then publish it from the catalog.'
                  : 'New catalog items are saved as unpublished. Publish from the catalog when you are ready for tenants to use this offering.'}
              </Content>
            </Alert>
          </div>
        )
      }
      default:
        return null
    }
  }

  function getStepFooter(stepId: (typeof PUBLISH_CATALOG_STEPS)[number]['id']) {
    if (stepId === 'service') {
      return { isNextDisabled: !selectedServiceId }
    }

    if (stepId === 'template') {
      return { isNextDisabled: !selectedTemplateRefId }
    }

    if (stepId === 'display-name') {
      return { isNextDisabled: !displayName.trim() }
    }

    if (stepId === 'publish-scope') {
      return {
        isNextDisabled: false,
      }
    }

    if (stepId === 'review') {
      return {
        nextButtonText: isPublishing ? (
          <span className="provider-admin-catalog__submit-label">
            <Spinner size="sm" aria-label="Creating catalog item" />
            <span>Creating…</span>
          </span>
        ) : (
          <span className="provider-admin-catalog__submit-label">
            <CatalogIcon aria-hidden />
            <span>Create catalog item</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        onNext: handleCreateCatalogItem,
        isNextDisabled: isPublishing || !canCreateCatalogItem,
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
