import { useEffect, useMemo, useRef, useState } from 'react'
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
import { CatalogSpecRowsList } from '../../components/catalog/CatalogSpecRowsList'
import { CatalogViewToggle } from '../../components/catalog/CatalogViewToggle'
import { TenantUserCatalogItemDetailsPage } from '../../components/tenant-user/TenantUserCatalogItemDetailsPage'
import { TenantUserLaunchInstanceWizard } from '../../components/tenant-user/TenantUserLaunchInstanceWizard'
import { formatCatalogConfigurationSummary } from '../../catalog/catalogSpecs'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import { formatCatalogTableResultCount } from '../../catalog/tableResultCount'
import { getCatalogViewMode, setCatalogViewMode, type CatalogViewMode } from '../../catalog/viewMode'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import { CATALOG_SERVICE_FILTER_LABELS, type CatalogServiceId } from '../../providerSetup/templateDemo'
import { getCatalogNetworkLockSummary } from '../../providerAdmin/catalogNetworkPolicy'
import {
  getTenantUserCatalogCards,
  type TenantUserCatalogCard,
} from '../../tenantUser/catalog'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'
import { resolveLaunchNetworkContext } from '../../tenantUser/launchNetworking'
import { TENANT_USER_CATALOG_PAGE } from '../../tenantUser/constants'
import type { TenantInstance } from '../../tenantUser/instances'
import type { TenantUserScopeKind } from '../../tenantUser/scope'

type TenantUserCatalogPageProps = {
  organization: RegisteredOrganization | null
  catalogDraft: ProviderCatalogDraft | null
  scopeKind: TenantUserScopeKind
  scopeLabel: string
  scopeFieldLabel: 'Organization' | 'Project'
  /** When true, open the launch wizard immediately (provider preview). */
  autoOpenLaunchWizard?: boolean
  /** Prefer the provided catalog draft even if org assignment differs. */
  preferCatalogDraft?: boolean
  existingInstanceNames?: readonly string[]
  onProvisioningStarted: (instance: TenantInstance) => void
  onDismissDuringProvisioning: (instanceId: string, serviceId: CatalogServiceId) => void
  onWizardFinished: (instanceId: string, serviceId: CatalogServiceId) => void
}

function NetworkingSummary({
  item,
  organization,
  catalogDraft,
  preferCatalogDraft,
  compact = false,
  onViewDetails,
}: {
  item: TenantUserCatalogCard
  organization: RegisteredOrganization | null
  catalogDraft: ProviderCatalogDraft | null
  preferCatalogDraft: boolean
  compact?: boolean
  onViewDetails?: () => void
}) {
  const networkContext = resolveLaunchNetworkContext(
    organization,
    catalogDraft,
    preferCatalogDraft,
    item.catalogItemId,
  )
  const lockSummary = getCatalogNetworkLockSummary(networkContext.policy)

  const statusContent = lockSummary ? (
    <span className="tenant-user-catalog__networking-status">
      <Label
        color={
          lockSummary.kind === 'all-locked'
            ? 'grey'
            : lockSummary.kind === 'all-editable'
              ? 'blue'
              : 'orange'
        }
        isCompact
        icon={lockSummary.kind === 'all-locked' ? <LockIcon /> : undefined}
        className="tenant-user-catalog__networking-status-label"
      >
        {lockSummary.label}
      </Label>
      {onViewDetails ? (
        <Button
          variant="link"
          isInline
          className="tenant-user-catalog__inline-link"
          onClick={onViewDetails}
        >
          Details
        </Button>
      ) : null}
    </span>
  ) : (
    <Content
      component="p"
      className={compact ? 'tenant-user-catalog__networking-table-summary' : undefined}
    >
      Not configured
    </Content>
  )

  if (compact) {
    return statusContent
  }

  return (
    <div className="tenant-user-catalog__spec-row">
      <dt className="tenant-user-catalog__spec-label">Networking</dt>
      <dd className="tenant-user-catalog__spec-value">{statusContent}</dd>
    </div>
  )
}

function getCatalogItemActions(
  onViewDetails: () => void,
  onLaunch: () => void,
): IAction[] {
  return [
    {
      title: 'View details',
      onClick: onViewDetails,
    },
    {
      title: LAUNCH_INSTANCE_WIZARD_DEMO.launchInstanceLabel,
      onClick: onLaunch,
    },
  ]
}

export function TenantUserCatalogPage({
  organization,
  catalogDraft,
  scopeKind,
  scopeLabel,
  scopeFieldLabel,
  autoOpenLaunchWizard = false,
  preferCatalogDraft = false,
  existingInstanceNames = [],
  onProvisioningStarted,
  onDismissDuringProvisioning,
  onWizardFinished,
}: TenantUserCatalogPageProps) {
  const [viewMode, setViewMode] = useState<CatalogViewMode>(() => getCatalogViewMode('grid'))
  const [isWizardOpen, setIsWizardOpen] = useState(false)
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const catalogItems = useMemo(
    () =>
      getTenantUserCatalogCards(organization, catalogDraft, {
        preferCatalogDraft,
      }),
    [organization, catalogDraft, preferCatalogDraft],
  )
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<TenantUserCatalogCard | null>(
    () => catalogItems[0] ?? null,
  )
  const initialServiceFilters = catalogItems.map((item) => item.serviceId)
  const [selectedFilters, setSelectedFilters] = useState<Set<CatalogServiceId>>(
    () => new Set(initialServiceFilters.length > 0 ? initialServiceFilters : ['baremetal']),
  )
  const knownServiceFiltersRef = useRef(new Set(initialServiceFilters))

  useEffect(() => {
    setSelectedFilters((current) => {
      const next = new Set(current)
      let changed = false

      for (const item of catalogItems) {
        if (!knownServiceFiltersRef.current.has(item.serviceId)) {
          knownServiceFiltersRef.current.add(item.serviceId)
          next.add(item.serviceId)
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [catalogItems])

  useEffect(() => {
    if (!selectedCatalogItem) {
      setSelectedCatalogItem(catalogItems[0] ?? null)
      return
    }

    const stillPresent = catalogItems.some(
      (item) => item.catalogItemId === selectedCatalogItem.catalogItemId,
    )
    if (!stillPresent) {
      setSelectedCatalogItem(catalogItems[0] ?? null)
    }
  }, [catalogItems, selectedCatalogItem])

  useEffect(() => {
    if (!autoOpenLaunchWizard || catalogItems.length === 0) {
      return
    }

    const preferred =
      (preferCatalogDraft && catalogDraft
        ? catalogItems.find((item) => item.catalogItemId === catalogDraft.catalogItemId)
        : null) ?? catalogItems[0]!
    setSelectedCatalogItem(preferred)
    setIsWizardOpen(true)
  }, [autoOpenLaunchWizard, catalogDraft, catalogItems, preferCatalogDraft])

  const serviceCounts = useMemo(
    () => countCatalogServices(catalogItems.map((item) => item.serviceId)),
    [catalogItems],
  )

  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return catalogItems.filter((item) => {
      if (!selectedFilters.has(item.serviceId)) {
        return false
      }

      if (!query) {
        return true
      }

      return (
        item.displayName.toLowerCase().includes(query) ||
        item.service.toLowerCase().includes(query) ||
        item.catalogItemId.toLowerCase().includes(query) ||
        item.templateName.toLowerCase().includes(query) ||
        item.specRows.some(
          (row) =>
            row.label.toLowerCase().includes(query) || row.value.toLowerCase().includes(query),
        )
      )
    })
  }, [catalogItems, selectedFilters, searchValue])

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
    if (searchValue.trim()) {
      return 'No catalog items match your search'
    }
    if (selectedFilters.size === 1) {
      const [onlyFilter] = selectedFilters
      return `No ${CATALOG_SERVICE_FILTER_LABELS[onlyFilter!]} items yet`
    }
    return 'No catalog items for the selected services'
  })()

  const openDetails = (item: TenantUserCatalogCard) => {
    setSelectedCatalogItem(item)
    setIsDetailsDrawerOpen(true)
  }

  const closeDetails = () => {
    setIsDetailsDrawerOpen(false)
  }

  const openLaunchWizard = (item: TenantUserCatalogCard) => {
    setSelectedCatalogItem(item)
    setIsDetailsDrawerOpen(false)
    setIsWizardOpen(true)
  }

  const activeCatalogItem = selectedCatalogItem ?? catalogItems[0] ?? null
  const detailsItem = isDetailsDrawerOpen ? selectedCatalogItem : null

  return (
    <>
      {detailsItem ? (
        <TenantUserCatalogItemDetailsPage
          catalogItem={detailsItem}
          organization={organization}
          catalogDraft={catalogDraft}
          preferCatalogDraft={preferCatalogDraft}
          onBack={closeDetails}
          onLaunch={() => openLaunchWizard(detailsItem)}
        />
      ) : (
      <div className="tenant-user-workspace-page tenant-user-catalog">
        <Title headingLevel="h1" size="3xl" className="tenant-user-catalog__title">
          Catalog
        </Title>
        <Content component="p" className="tenant-user-catalog__lede">
          {scopeKind === 'organization'
            ? TENANT_USER_CATALOG_PAGE.organizationLede
            : TENANT_USER_CATALOG_PAGE.projectLede}
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

        {filteredItems.length === 0 ? (
          <EmptyState className="tenant-user-catalog__empty">
            <Title headingLevel="h2" size="lg">
              {emptyStateTitle}
            </Title>
            <EmptyStateBody>
              {selectedFilters.size === 0
                ? 'Choose one or more services above to filter the catalog.'
                : searchValue.trim()
                  ? 'Try a different search term or clear the search field.'
                  : 'No catalog items match the selected services.'}
            </EmptyStateBody>
          </EmptyState>
        ) : viewMode === 'grid' ? (
          <div className="catalog-card-grid tenant-user-catalog__grid">
            {filteredItems.map((item) => {
              const catalogItemActions = getCatalogItemActions(
                () => openDetails(item),
                () => openLaunchWizard(item),
              )

              return (
                <Card key={item.catalogItemId} isCompact={false} className="tenant-user-catalog__card">
                  <CardBody>
                    <div className="tenant-user-catalog__card-header">
                      <span className="tenant-user-catalog__icon" aria-hidden>
                        {getCatalogServiceIcon(item.serviceId)}
                      </span>
                      <div className="tenant-user-catalog__card-header-actions">
                        <Label color="blue" className="tenant-user-catalog__card-label">
                          {item.service}
                        </Label>
                        <Label color="green" className="tenant-user-catalog__card-label">
                          {item.status}
                        </Label>
                        <ActionsColumn items={catalogItemActions} />
                      </div>
                    </div>

                    <Content component="p" className="tenant-user-catalog__primary-cell">
                      <Button
                        variant="link"
                        isInline
                        className="tenant-user-catalog__name-link catalog-item-name-link"
                        onClick={() => openDetails(item)}
                      >
                        {item.displayName}
                      </Button>
                    </Content>

                    <CatalogSpecRowsList
                      rows={item.specRows}
                      className="tenant-user-catalog__specs-list"
                      rowClassName="tenant-user-catalog__spec-row"
                      labelClassName="tenant-user-catalog__spec-label"
                      valueClassName="tenant-user-catalog__spec-value"
                    />

                    <dl className="tenant-user-catalog__networking-list">
                      <NetworkingSummary
                        item={item}
                        organization={organization}
                        catalogDraft={catalogDraft}
                        preferCatalogDraft={preferCatalogDraft}
                        onViewDetails={() => openDetails(item)}
                      />
                    </dl>

                    <div className="tenant-user-catalog__footer-note">
                      <LockIcon aria-hidden />
                      <span>{item.footerNote}</span>
                    </div>
                    <Button
                      variant="primary"
                      icon={<RocketIcon />}
                      isBlock
                      onClick={() => openLaunchWizard(item)}
                      className="tenant-user-catalog__launch-button"
                    >
                      {LAUNCH_INSTANCE_WIZARD_DEMO.launchInstanceLabel}
                    </Button>
                  </CardBody>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="catalog-table-panel">
            <Content component="p" className="catalog-table-result-count">
              {formatCatalogTableResultCount(filteredItems.length, 'catalog item')}
            </Content>
            <Table
              aria-label="Catalog items"
              className="catalog-data-table tenant-user-catalog__table"
            >
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Status</Th>
                  <Th>Configuration</Th>
                  <Th>Networking</Th>
                  <Th>Action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredItems.map((item) => (
                  <Tr key={item.catalogItemId}>
                    <Td dataLabel="Name">
                      <Content component="p" className="tenant-user-catalog__display-name">
                        <Button
                          variant="link"
                          isInline
                          className="tenant-user-catalog__name-link catalog-item-name-link"
                          onClick={() => openDetails(item)}
                        >
                          {item.displayName}
                        </Button>
                      </Content>
                      <Content component="p" className="tenant-user-catalog__category-label">
                        {item.service}
                      </Content>
                    </Td>
                    <Td dataLabel="Status">
                      <Label color="green" isCompact>
                        {item.status}
                      </Label>
                    </Td>
                    <Td dataLabel="Configuration">
                      {formatCatalogConfigurationSummary({
                        serviceId: item.serviceId,
                        templateRefId: item.templateRefId,
                        templateName: item.templateName,
                      })}
                    </Td>
                    <Td dataLabel="Networking">
                      <NetworkingSummary
                        item={item}
                        organization={organization}
                        catalogDraft={catalogDraft}
                        preferCatalogDraft={preferCatalogDraft}
                        compact
                        onViewDetails={() => openDetails(item)}
                      />
                    </Td>
                    <Td dataLabel="Action">
                      <Button
                        variant="primary"
                        icon={<RocketIcon />}
                        onClick={() => openLaunchWizard(item)}
                        className="tenant-user-catalog__launch-button"
                      >
                        {LAUNCH_INSTANCE_WIZARD_DEMO.launchInstanceLabel}
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}

        {activeCatalogItem ? (
          <TenantUserLaunchInstanceWizard
            isOpen={isWizardOpen}
            catalogItem={activeCatalogItem}
            organization={organization}
            catalogDraft={catalogDraft}
            preferCatalogDraft={preferCatalogDraft}
            scopeKind={scopeKind}
            scopeLabel={scopeLabel}
            scopeFieldLabel={scopeFieldLabel}
            existingInstanceNames={existingInstanceNames}
            onClose={() => setIsWizardOpen(false)}
            onProvisioningStarted={onProvisioningStarted}
            onDismissDuringProvisioning={(instanceId, serviceId) => {
              onDismissDuringProvisioning(instanceId, serviceId)
              setIsWizardOpen(false)
            }}
            onWizardFinished={(instanceId, serviceId) => {
              onWizardFinished(instanceId, serviceId)
              setIsWizardOpen(false)
            }}
          />
        ) : null}
      </div>
      )}
    </>
  )
}
