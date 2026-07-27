import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  Label,
  SearchInput,
  Title,
} from '@patternfly/react-core'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import { RocketIcon } from '@patternfly/react-icons/dist/esm/icons/rocket-icon'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr, type IAction } from '@patternfly/react-table'
import {
  CatalogServiceFilterToggle,
  countCatalogServices,
  toggleCatalogServiceFilter,
} from '../../components/catalog/CatalogServiceFilterToggle'
import { CatalogViewToggle } from '../../components/catalog/CatalogViewToggle'
import { TenantUserCatalogItemDetailsDrawer } from '../../components/tenant-user/TenantUserCatalogItemDetailsDrawer'
import { TenantUserLaunchInstanceWizard } from '../../components/tenant-user/TenantUserLaunchInstanceWizard'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import { formatCatalogTableResultCount } from '../../catalog/tableResultCount'
import { getCatalogViewMode, setCatalogViewMode, type CatalogViewMode } from '../../catalog/viewMode'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import { CATALOG_SERVICE_FILTER_LABELS, type CatalogServiceId } from '../../providerSetup/templateDemo'
import { getTenantUserCatalogCard, getTenantUserCatalogCardFromDraft } from '../../tenantUser/catalog'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'
import { resolveLaunchNetworkContext } from '../../tenantUser/launchNetworking'
import { TENANT_USER_CATALOG_PAGE } from '../../tenantUser/constants'
import type { TenantInstance } from '../../tenantUser/instances'

type TenantUserCatalogPageProps = {
  organization: RegisteredOrganization | null
  catalogDraft: ProviderCatalogDraft | null
  projectName: string
  /** When true, open the launch wizard immediately (provider preview). */
  autoOpenLaunchWizard?: boolean
  /** Prefer the provided catalog draft even if org assignment differs. */
  preferCatalogDraft?: boolean
  existingInstanceNames?: readonly string[]
  onProvisioningStarted: (instance: TenantInstance) => void
  onDismissDuringProvisioning: (instanceId: string) => void
  onWizardFinished: (instanceId: string) => void
}

export function TenantUserCatalogPage({
  organization,
  catalogDraft,
  projectName,
  autoOpenLaunchWizard = false,
  preferCatalogDraft = false,
  existingInstanceNames = [],
  onProvisioningStarted,
  onDismissDuringProvisioning,
  onWizardFinished,
}: TenantUserCatalogPageProps) {
  const [viewMode, setViewMode] = useState<CatalogViewMode>(() => getCatalogViewMode('grid'))
  const [isWizardOpen, setIsWizardOpen] = useState(autoOpenLaunchWizard)
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const catalogItem = useMemo(() => {
    if (preferCatalogDraft && catalogDraft) {
      return getTenantUserCatalogCardFromDraft(catalogDraft)
    }
    return getTenantUserCatalogCard(organization, catalogDraft)
  }, [organization, catalogDraft, preferCatalogDraft])
  const networkContext = useMemo(
    () => resolveLaunchNetworkContext(organization, catalogDraft, preferCatalogDraft),
    [organization, catalogDraft, preferCatalogDraft],
  )
  const [selectedFilters, setSelectedFilters] = useState<Set<CatalogServiceId>>(
    () => new Set([catalogItem.serviceId]),
  )

  useEffect(() => {
    setSelectedFilters(new Set([catalogItem.serviceId]))
  }, [catalogItem.catalogItemId, catalogItem.serviceId])

  useEffect(() => {
    if (autoOpenLaunchWizard) {
      setIsWizardOpen(true)
    }
  }, [autoOpenLaunchWizard, catalogItem.catalogItemId])

  const serviceCounts = useMemo(
    () => countCatalogServices([catalogItem.serviceId]),
    [catalogItem.serviceId],
  )

  const matchesActiveFilter = selectedFilters.has(catalogItem.serviceId)
  const matchesSearch = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    if (!query) {
      return true
    }

    return (
      catalogItem.displayName.toLowerCase().includes(query) ||
      catalogItem.service.toLowerCase().includes(query) ||
      catalogItem.catalogItemId.toLowerCase().includes(query) ||
      catalogItem.cpu.toLowerCase().includes(query) ||
      catalogItem.ram.toLowerCase().includes(query) ||
      catalogItem.gpu.toLowerCase().includes(query) ||
      catalogItem.osImage.toLowerCase().includes(query)
    )
  }, [catalogItem, searchValue])
  const showCatalogItem = matchesActiveFilter && matchesSearch

  const handleViewModeChange = (nextViewMode: CatalogViewMode) => {
    setViewMode(nextViewMode)
    setCatalogViewMode(nextViewMode)
  }

  const handleFilterToggle = (serviceId: CatalogServiceId, isSelected: boolean) => {
    setSelectedFilters((current) => toggleCatalogServiceFilter(current, serviceId, isSelected))
  }

  const emptyStateTitle = (() => {
    if (selectedFilters.size === 0) {
      return 'Select a service to view catalog items'
    }
    if (searchValue.trim() && matchesActiveFilter) {
      return 'No catalog items match your search'
    }
    if (selectedFilters.size === 1) {
      const [onlyFilter] = selectedFilters
      return `No ${CATALOG_SERVICE_FILTER_LABELS[onlyFilter!]} items yet`
    }
    return 'No catalog items for the selected services'
  })()

  const openDetails = () => {
    setIsDetailsDrawerOpen(true)
  }

  const closeDetails = () => {
    setIsDetailsDrawerOpen(false)
  }

  const openLaunchWizard = () => {
    setIsDetailsDrawerOpen(false)
    setIsWizardOpen(true)
  }

  const catalogItemActions: IAction[] = [
    {
      title: 'View details',
      onClick: openDetails,
    },
    {
      title: LAUNCH_INSTANCE_WIZARD_DEMO.launchInstanceLabel,
      onClick: openLaunchWizard,
    },
  ]

  const launchButton = (
    <Button
      variant="primary"
      icon={<RocketIcon />}
      isBlock={viewMode === 'grid'}
      onClick={openLaunchWizard}
      className="tenant-user-catalog__launch-button"
    >
      {LAUNCH_INSTANCE_WIZARD_DEMO.launchInstanceLabel}
    </Button>
  )

  const nameLink = (
    <Button
      variant="link"
      isInline
      className="tenant-user-catalog__name-link catalog-item-name-link"
      onClick={openDetails}
    >
      {catalogItem.displayName}
    </Button>
  )

  return (
    <TenantUserCatalogItemDetailsDrawer
      isExpanded={isDetailsDrawerOpen}
      onClose={closeDetails}
      catalogItem={isDetailsDrawerOpen ? catalogItem : null}
      networkContext={networkContext}
      onLaunch={openLaunchWizard}
    >
      <div className="tenant-user-workspace-page tenant-user-catalog">
        <Title headingLevel="h1" size="3xl" className="tenant-user-catalog__title">
          Catalog
        </Title>
        <Content component="p" className="tenant-user-catalog__lede">
          {TENANT_USER_CATALOG_PAGE.lede}
        </Content>

        <div className="catalog-view-toolbar tenant-user-catalog__toolbar">
          <div className="catalog-view-toolbar__start">
            <CatalogServiceFilterToggle
              selectedFilters={selectedFilters}
              serviceCounts={serviceCounts}
              onToggle={handleFilterToggle}
            />
            <SearchInput
              className="catalog-search"
              placeholder="Search catalog items"
              value={searchValue}
              onChange={(_event, value) => setSearchValue(value)}
              onClear={() => setSearchValue('')}
              aria-label="Search catalog items"
            />
          </div>
          <CatalogViewToggle viewMode={viewMode} onChange={handleViewModeChange} />
        </div>

        {!showCatalogItem ? (
          <EmptyState className="tenant-user-catalog__empty">
            <Title headingLevel="h2" size="lg">
              {emptyStateTitle}
            </Title>
            <EmptyStateBody>
              {selectedFilters.size === 0
                ? 'Choose one or more services above to filter the catalog.'
                : searchValue.trim() && matchesActiveFilter
                  ? 'Try a different search term or clear the search field.'
                  : 'No catalog items match the selected services.'}
            </EmptyStateBody>
          </EmptyState>
        ) : viewMode === 'grid' ? (
          <div className="catalog-card-grid tenant-user-catalog__grid">
            <Card isCompact={false} className="tenant-user-catalog__card">
              <CardBody>
                <div className="tenant-user-catalog__card-header">
                  <span className="tenant-user-catalog__icon" aria-hidden>
                    {getCatalogServiceIcon(catalogItem.serviceId)}
                  </span>
                  <div className="tenant-user-catalog__card-header-actions">
                    <Label color="blue" className="tenant-user-catalog__card-label">
                      {catalogItem.service}
                    </Label>
                    <Label color="green" className="tenant-user-catalog__card-label">
                      {catalogItem.status}
                    </Label>
                    <ActionsColumn items={catalogItemActions} />
                  </div>
                </div>

                <Content component="p" className="tenant-user-catalog__primary-cell">
                  {nameLink}
                </Content>

                <dl className="tenant-user-catalog__specs-list">
                  <div className="tenant-user-catalog__spec-row">
                    <dt className="tenant-user-catalog__spec-label">CPU</dt>
                    <dd className="tenant-user-catalog__spec-value">{catalogItem.cpu}</dd>
                  </div>
                  <div className="tenant-user-catalog__spec-row">
                    <dt className="tenant-user-catalog__spec-label">RAM</dt>
                    <dd className="tenant-user-catalog__spec-value">{catalogItem.ram}</dd>
                  </div>
                  <div className="tenant-user-catalog__spec-row">
                    <dt className="tenant-user-catalog__spec-label">GPU</dt>
                    <dd className="tenant-user-catalog__spec-value">{catalogItem.gpu}</dd>
                  </div>
                  <div className="tenant-user-catalog__spec-row">
                    <dt className="tenant-user-catalog__spec-label">OS image</dt>
                    <dd className="tenant-user-catalog__spec-value">{catalogItem.osImage}</dd>
                  </div>
                </dl>

                <div className="tenant-user-catalog__footer-note">
                  <LockIcon aria-hidden />
                  <span>{catalogItem.footerNote}</span>
                </div>
                {launchButton}
              </CardBody>
            </Card>
          </div>
        ) : (
          <div className="catalog-table-panel">
            <Content component="p" className="catalog-table-result-count">
              {formatCatalogTableResultCount(1, 'catalog item')}
            </Content>
            <Table
              aria-label="Catalog items"
              className="catalog-data-table tenant-user-catalog__table"
            >
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Status</Th>
                  <Th>CPU</Th>
                  <Th>RAM</Th>
                  <Th>GPU</Th>
                  <Th>OS image</Th>
                  <Th>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td dataLabel="Name">
                    <Content component="p" className="tenant-user-catalog__display-name">
                      {nameLink}
                    </Content>
                    <Content component="p" className="tenant-user-catalog__category-label">
                      {catalogItem.categoryLabel}
                    </Content>
                  </Td>
                  <Td dataLabel="Status">
                    <Label color="green" isCompact>
                      {catalogItem.status}
                    </Label>
                  </Td>
                  <Td dataLabel="CPU">{catalogItem.cpu}</Td>
                  <Td dataLabel="RAM">{catalogItem.ram}</Td>
                  <Td dataLabel="GPU">{catalogItem.gpu}</Td>
                  <Td dataLabel="OS image">{catalogItem.osImage}</Td>
                  <Td dataLabel="Action">{launchButton}</Td>
                </Tr>
              </Tbody>
            </Table>
          </div>
        )}

        <TenantUserLaunchInstanceWizard
          isOpen={isWizardOpen}
          catalogItem={catalogItem}
          organization={organization}
          catalogDraft={catalogDraft}
          preferCatalogDraft={preferCatalogDraft}
          projectName={projectName}
          existingInstanceNames={existingInstanceNames}
          onClose={() => setIsWizardOpen(false)}
          onProvisioningStarted={onProvisioningStarted}
          onDismissDuringProvisioning={(instanceId) => {
            setIsWizardOpen(false)
            onDismissDuringProvisioning(instanceId)
          }}
          onWizardFinished={(instanceId) => {
            setIsWizardOpen(false)
            onWizardFinished(instanceId)
          }}
        />
      </div>
    </TenantUserCatalogItemDetailsDrawer>
  )
}
