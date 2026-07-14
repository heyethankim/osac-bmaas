import { useMemo, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Alert,
  AlertActionCloseButton,
  AlertActionLink,
  Button,
  Content,
  Flex,
  FlexItem,
  Label,
  Title,
} from '@patternfly/react-core'
import { Table, ActionsColumn, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import { AssignCatalogToOrganizationModal } from '../components/provider-admin/AssignCatalogToOrganizationModal'
import { CatalogPublishScopeIcon } from '../components/provider-admin/CatalogPublishScopeIcon'
import type { ProviderCatalogDraft } from '../providerSetup/storage'
import {
  assignCatalogToRegisteredOrganization,
  getOrganizationsAssignedToCatalogItem,
  getProviderRegisteredOrganizations,
  getProviderSavedTemplate,
} from '../providerSetup/storage'
import {
  DEFAULT_BLUEPRINT_FORM,
  DEMO_EXISTING_MASTER_TEMPLATES,
  formatRateCardSummary,
  parseRateCardFromForm,
  type PublishedTemplatePayload,
} from '../providerSetup/templateDemo'
import { ProviderSetupPublishCatalogWizard } from './provider-setup/ProviderSetupPublishCatalogWizard'

type ProviderAdminCatalogPageProps = {
  catalogDraft: ProviderCatalogDraft
  isEntering?: boolean
  onCreateCatalogItem: (payload: PublishedTemplatePayload) => void
  isPublishing?: boolean
  onRegisterOrganization?: () => void
}

type CatalogFilter = 'all' | 'bare-metal'

function formatCatalogCreatedAt(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

function ScopeCell({ scope }: { scope: ProviderCatalogDraft['scope'] }) {
  const label = scope === 'vip-enterprise' ? 'VIP enterprise' : 'Global'

  return (
    <span className="provider-admin-catalog-items__scope">
      <CatalogPublishScopeIcon scope={scope} className="provider-admin-catalog__scope-icon" />
      <span>{label}</span>
    </span>
  )
}

function getTemplateRowData() {
  const saved = getProviderSavedTemplate()
  if (saved) {
    return saved
  }

  return {
    templateRefId: 'bm_pending',
    templateName: DEFAULT_BLUEPRINT_FORM.templateName,
    description: DEFAULT_BLUEPRINT_FORM.description,
    hardwareProfileId: DEFAULT_BLUEPRINT_FORM.hardwareProfileId,
    osImageId: DEFAULT_BLUEPRINT_FORM.osImage,
    suggestedDisplayName: DEFAULT_BLUEPRINT_FORM.templateName,
    rateCard: parseRateCardFromForm(DEFAULT_BLUEPRINT_FORM)!,
  }
}

function getCatalogItemActions(
  hasUnassignedOrganizations: boolean,
  onAssignToOrganization: () => void,
  onRegisterOrganization?: () => void,
): IAction[] {
  return [
    {
      title: 'View details',
      onClick: () => {
        /* demo */
      },
    },
    {
      title: 'Assign to organization',
      isAriaDisabled: !hasUnassignedOrganizations,
      onClick: () => {
        if (hasUnassignedOrganizations) {
          onAssignToOrganization()
        }
      },
    },
    {
      title: 'Register organization',
      onClick: () => {
        onRegisterOrganization?.()
      },
    },
    {
      title: 'Edit display name',
      onClick: () => {
        /* demo */
      },
    },
    {
      isSeparator: true,
    },
    {
      title: 'Unpublish',
      onClick: () => {
        /* demo */
      },
    },
  ]
}

export function ProviderAdminCatalogPage({
  catalogDraft,
  isEntering = false,
  onCreateCatalogItem,
  isPublishing = false,
  onRegisterOrganization,
}: ProviderAdminCatalogPageProps) {
  const [activeFilter, setActiveFilter] = useState<CatalogFilter>('all')
  const [organizations, setOrganizations] = useState(() => getProviderRegisteredOrganizations())
  const [isPublishWizardOpen, setIsPublishWizardOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [showNextStepAlert, setShowNextStepAlert] = useState(
    () => getProviderRegisteredOrganizations().length === 0,
  )

  const assignedOrganizations = useMemo(
    () => getOrganizationsAssignedToCatalogItem(catalogDraft.catalogItemId),
    [catalogDraft.catalogItemId, organizations],
  )
  const unassignedOrganizations = useMemo(
    () => organizations.filter((organization) => !organization.catalogItemId),
    [organizations],
  )
  const hasRegisteredOrganizations = organizations.length > 0
  const hasUnassignedOrganizations = unassignedOrganizations.length > 0

  const availableTemplates = useMemo(() => {
    const template = getTemplateRowData()
    const templates = [template, ...DEMO_EXISTING_MASTER_TEMPLATES]
    const seen = new Set<string>()
    return templates.filter((item) => {
      if (seen.has(item.templateRefId)) {
        return false
      }
      seen.add(item.templateRefId)
      return true
    })
  }, [isPublishWizardOpen])

  const refreshOrganizations = () => {
    setOrganizations(getProviderRegisteredOrganizations())
  }

  const handleAssignCatalog = (organizationId: string) => {
    assignCatalogToRegisteredOrganization(organizationId, catalogDraft)
    refreshOrganizations()
    setIsAssignModalOpen(false)
  }

  return (
    <div
      className={`provider-admin-catalog-items${
        isEntering ? ' provider-admin-catalog-items--entering' : ''
      }`}
    >
      <Flex
        className="provider-admin-catalog-items__header"
        alignItems={{ default: 'alignItemsFlexStart' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        gap={{ default: 'gapMd' }}
      >
        <FlexItem>
          <Label color="blue" className="provider-admin-catalog-items__kicker">
            Global marketplace
          </Label>
          <Title headingLevel="h1" size="3xl" className="provider-admin-catalog-items__title">
            Catalog items
          </Title>
          <Content component="p" className="provider-admin-catalog-items__lede">
            Publish BMaaS products from master templates, then attach catalog items to tenant
            organizations.
          </Content>
        </FlexItem>
        <FlexItem alignSelf={{ default: 'alignSelfFlexStart' }}>
          <Button
            variant="primary"
            icon={<PlusIcon />}
            className="provider-admin-catalog-items__create"
            isDisabled={isPublishing}
            onClick={() => setIsPublishWizardOpen(true)}
          >
            Create catalog item
          </Button>
        </FlexItem>
      </Flex>

      <div className="provider-admin-catalog-items__filters" role="tablist" aria-label="Catalog filters">
        <Button
          variant={activeFilter === 'all' ? 'primary' : 'secondary'}
          className="provider-admin-catalog-items__filter"
          onClick={() => setActiveFilter('all')}
          aria-pressed={activeFilter === 'all'}
        >
          All (1)
        </Button>
        <Button
          variant={activeFilter === 'bare-metal' ? 'primary' : 'secondary'}
          className="provider-admin-catalog-items__filter"
          onClick={() => setActiveFilter('bare-metal')}
          aria-pressed={activeFilter === 'bare-metal'}
        >
          BMaaS (1)
        </Button>
      </div>

      {showNextStepAlert && !hasRegisteredOrganizations ? (
        <Alert
          variant="info"
          title={
            <span className="provider-admin-catalog-items__alert-title">
              <span>Attach this catalog item to a tenant organization</span>
              <Label color="blue" isCompact className="provider-admin-catalog-items__next-step-label">
                Next step
              </Label>
            </span>
          }
          className="provider-admin-catalog-items__next-step-alert"
          actionClose={
            <AlertActionCloseButton
              onClose={() => setShowNextStepAlert(false)}
              title="Dismiss next step"
            />
          }
          actionLinks={
            <AlertActionLink component="button" onClick={onRegisterOrganization}>
              Register organization
            </AlertActionLink>
          }
        >
          <Content component="p">
            Your catalog item is live. Register a tenant organization or assign this item to an
            existing organization so tenant admins can provision from the storefront.
          </Content>
        </Alert>
      ) : null}

      {hasRegisteredOrganizations && hasUnassignedOrganizations ? (
        <Alert
          variant="info"
          isInline
          title="Organizations are waiting for catalog access"
          className="provider-admin-catalog-items__assign-alert"
          actionLinks={
            <AlertActionLink component="button" onClick={() => setIsAssignModalOpen(true)}>
              Assign to organization
            </AlertActionLink>
          }
        >
          <Content component="p">
            {unassignedOrganizations.length} registered{' '}
            {unassignedOrganizations.length === 1 ? 'organization does' : 'organizations do'} not
            have a catalog item attached yet.
          </Content>
        </Alert>
      ) : null}

      <Table
        aria-label="Catalog items"
        variant="compact"
        borders={false}
        className="provider-admin-catalog-items__table"
      >
        <Thead>
          <Tr>
            <Th>Service</Th>
            <Th>Status</Th>
            <Th>Display name</Th>
            <Th>Linked template</Th>
            <Th>Rate</Th>
            <Th>Scope</Th>
            <Th>Assigned tenants</Th>
            <Th>Created</Th>
            <Th screenReaderText="Actions" />
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td dataLabel="Service">BMaaS</Td>
            <Td dataLabel="Status">
              <Label color="green" isCompact className="provider-admin-catalog-items__status">
                Live
              </Label>
            </Td>
            <Td dataLabel="Display name">
              <Content component="p" className="provider-admin-catalog-items__primary-cell">
                {catalogDraft.displayName}
              </Content>
              <Content component="p" className="provider-admin-catalog-items__secondary-cell">
                <code>{catalogDraft.catalogItemId}</code>
              </Content>
            </Td>
            <Td dataLabel="Linked template">
              <Content component="p" className="provider-admin-catalog-items__primary-cell">
                <code>{catalogDraft.templateRefId}</code>
              </Content>
              <Content component="p" className="provider-admin-catalog-items__secondary-cell">
                {catalogDraft.templateName}
              </Content>
            </Td>
            <Td dataLabel="Rate">
              <Content component="p" className="provider-admin-catalog-items__primary-cell">
                {formatRateCardSummary(catalogDraft.rateCard)}
              </Content>
            </Td>
            <Td dataLabel="Scope">
              <ScopeCell scope={catalogDraft.scope} />
            </Td>
            <Td dataLabel="Assigned tenants">
              {assignedOrganizations.length > 0 ? (
                <>
                  <Content component="p" className="provider-admin-catalog-items__primary-cell">
                    {assignedOrganizations.length}{' '}
                    {assignedOrganizations.length === 1 ? 'organization' : 'organizations'}
                  </Content>
                  <Content component="p" className="provider-admin-catalog-items__secondary-cell">
                    {assignedOrganizations.map((organization) => organization.name).join(', ')}
                  </Content>
                </>
              ) : (
                'Not assigned'
              )}
            </Td>
            <Td dataLabel="Created">{formatCatalogCreatedAt(catalogDraft.createdAt)}</Td>
            <Td isActionCell>
              <ActionsColumn
                items={getCatalogItemActions(
                  hasUnassignedOrganizations,
                  () => setIsAssignModalOpen(true),
                  onRegisterOrganization,
                )}
              />
            </Td>
          </Tr>
        </Tbody>
      </Table>

      <ProviderSetupPublishCatalogWizard
        isOpen={isPublishWizardOpen}
        templates={availableTemplates}
        defaultTemplateRefId={catalogDraft.templateRefId}
        onClose={() => setIsPublishWizardOpen(false)}
        onCreateCatalogItem={(payload) => {
          setIsPublishWizardOpen(false)
          onCreateCatalogItem(payload)
        }}
        isPublishing={isPublishing}
      />

      <AssignCatalogToOrganizationModal
        catalog={isAssignModalOpen ? catalogDraft : null}
        organizations={organizations}
        onClose={() => setIsAssignModalOpen(false)}
        onAssign={handleAssignCatalog}
      />
    </div>
  )
}
