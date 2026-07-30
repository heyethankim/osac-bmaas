import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  AlertActionCloseButton,
  Button,
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  SearchInput,
  Spinner,
  Title,
} from '@patternfly/react-core'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import {
  CatalogServiceFilterToggle,
  countCatalogServices,
  toggleCatalogServiceFilter,
} from '../../components/catalog/CatalogServiceFilterToggle'
import { ViewModeToggle } from '../../components/catalog/CatalogViewToggle'
import { CatalogSpecRowsList } from '../../components/catalog/CatalogSpecRowsList'
import { TenantUserInstanceDetailsDrawer } from '../../components/tenant-user/TenantUserInstanceDetailsDrawer'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import { formatCatalogTableResultCount } from '../../catalog/tableResultCount'
import {
  getInstancesViewMode,
  setInstancesViewMode,
  type ViewMode,
} from '../../catalog/viewMode'
import { CATALOG_SERVICE_FILTER_LABELS, type CatalogServiceId } from '../../providerSetup/templateDemo'
import {
  formatTenantInstanceCreatedAt,
  formatTenantInstanceName,
  getTenantInstanceActions,
  getTenantInstanceScopeFieldLabel,
  getTenantInstanceServiceId,
  getTenantInstanceSpecRows,
  getTenantInstanceStatusLabel,
  TENANT_INSTANCE_RESTART_DURATION_MS,
  type TenantInstance,
} from '../../tenantUser/instances'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'
import { removeTenantUserInstance, updateTenantUserInstance } from '../../tenantUser/storage'

type TenantUserInstancesPageProps = {
  tenantSlug: string
  instances: TenantInstance[]
  onInstancesChange: (instances: TenantInstance[]) => void
  defaultScopeFieldLabel?: 'Organization' | 'Project'
  /** When set, page is scoped to one service (nav-driven) and hides service filters. */
  lockedServiceId?: CatalogServiceId
  showBackgroundProvisioningNotice?: boolean
  onDismissBackgroundProvisioningNotice?: () => void
}

function getStatusColor(status: TenantInstance['status']): 'green' | 'blue' | 'orange' | 'red' {
  switch (status) {
    case 'running':
      return 'green'
    case 'provisioning':
    case 'restarting':
      return 'blue'
    case 'failed':
      return 'red'
    default:
      return 'blue'
  }
}

function InstanceStatusLabel({ status }: { status: TenantInstance['status'] }) {
  return (
    <Label
      color={getStatusColor(status)}
      isCompact
      icon={
        status === 'provisioning' || status === 'restarting' ? (
          <Spinner
            isInline
            diameter="0.625rem"
            aria-hidden
            className="tenant-user-instances__status-spinner"
          />
        ) : undefined
      }
    >
      {getTenantInstanceStatusLabel(status)}
    </Label>
  )
}

export function TenantUserInstancesPage({
  tenantSlug,
  instances,
  onInstancesChange,
  defaultScopeFieldLabel = 'Project',
  lockedServiceId,
  showBackgroundProvisioningNotice = false,
  onDismissBackgroundProvisioningNotice,
}: TenantUserInstancesPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => getInstancesViewMode('grid'))
  const [searchValue, setSearchValue] = useState('')
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false)
  const [instancePendingTerminate, setInstancePendingTerminate] = useState<TenantInstance | null>(
    null,
  )
  const restartTimersRef = useRef<Map<string, number>>(new Map())

  const instanceServiceIds = useMemo(
    () => instances.map((instance) => getTenantInstanceServiceId(instance)),
    [instances],
  )
  const initialServiceFilters = lockedServiceId
    ? [lockedServiceId]
    : instanceServiceIds.length > 0
      ? instanceServiceIds
      : (['baremetal'] as const)
  const [selectedFilters, setSelectedFilters] = useState<Set<CatalogServiceId>>(
    () => new Set(initialServiceFilters),
  )
  const knownServiceFiltersRef = useRef(new Set(initialServiceFilters))

  useEffect(() => {
    if (!lockedServiceId) {
      return
    }
    setSelectedFilters(new Set([lockedServiceId]))
  }, [lockedServiceId])

  const scopeColumnLabel = useMemo(() => {
    if (instances.length === 0) {
      return defaultScopeFieldLabel
    }
    const labels = new Set(
      instances.map((instance) => getTenantInstanceScopeFieldLabel(instance)),
    )
    return labels.size === 1 ? [...labels][0] : 'Scope'
  }, [defaultScopeFieldLabel, instances])

  const sortedInstances = useMemo(
    () =>
      [...instances].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [instances],
  )

  const serviceCounts = useMemo(
    () => countCatalogServices(instanceServiceIds),
    [instanceServiceIds],
  )

  const filteredInstances = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    return sortedInstances.filter((instance) => {
      const serviceId = getTenantInstanceServiceId(instance)
      if (!selectedFilters.has(serviceId)) {
        return false
      }

      if (!query) {
        return true
      }

      const serviceLabel = CATALOG_SERVICE_FILTER_LABELS[serviceId]
      const specRows = getTenantInstanceSpecRows(instance)

      return (
        instance.name.toLowerCase().includes(query) ||
        formatTenantInstanceName(instance.name).toLowerCase().includes(query) ||
        instance.catalogItemDisplayName.toLowerCase().includes(query) ||
        serviceLabel.toLowerCase().includes(query) ||
        getTenantInstanceStatusLabel(instance.status).toLowerCase().includes(query) ||
        specRows.some(
          (row) =>
            row.label.toLowerCase().includes(query) || row.value.toLowerCase().includes(query),
        )
      )
    })
  }, [sortedInstances, selectedFilters, searchValue])

  const selectedInstance = useMemo(
    () => instances.find((instance) => instance.id === selectedInstanceId) ?? null,
    [instances, selectedInstanceId],
  )

  useEffect(() => {
    if (lockedServiceId) {
      return
    }
    setSelectedFilters((current) => {
      const next = new Set(current)
      let changed = false
      for (const serviceId of instanceServiceIds) {
        if (!knownServiceFiltersRef.current.has(serviceId)) {
          knownServiceFiltersRef.current.add(serviceId)
          next.add(serviceId)
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [instanceServiceIds, lockedServiceId])

  useEffect(() => {
    return () => {
      for (const timeoutId of restartTimersRef.current.values()) {
        window.clearTimeout(timeoutId)
      }
      restartTimersRef.current.clear()
    }
  }, [])

  const closeDetails = () => {
    setIsDetailsDrawerOpen(false)
  }

  const handleTerminateInstance = (instanceId: string) => {
    const timeoutId = restartTimersRef.current.get(instanceId)
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
      restartTimersRef.current.delete(instanceId)
    }
    onInstancesChange(removeTenantUserInstance(tenantSlug, instanceId))
    if (selectedInstanceId === instanceId) {
      setSelectedInstanceId(null)
      setIsDetailsDrawerOpen(false)
    }
  }

  const openTerminateConfirm = (instance: TenantInstance) => {
    setInstancePendingTerminate(instance)
  }

  const closeTerminateConfirm = () => {
    setInstancePendingTerminate(null)
  }

  const handleConfirmTerminate = () => {
    if (!instancePendingTerminate) {
      return
    }
    const instanceId = instancePendingTerminate.id
    setInstancePendingTerminate(null)
    handleTerminateInstance(instanceId)
  }

  const handleRestartInstance = (instanceId: string) => {
    const instance = instances.find((item) => item.id === instanceId)
    if (!instance || instance.status !== 'running') {
      return
    }

    const existingTimeout = restartTimersRef.current.get(instanceId)
    if (existingTimeout !== undefined) {
      window.clearTimeout(existingTimeout)
    }

    onInstancesChange(
      updateTenantUserInstance(tenantSlug, instanceId, {
        status: 'restarting',
      }),
    )

    const timeoutId = window.setTimeout(() => {
      restartTimersRef.current.delete(instanceId)
      onInstancesChange(
        updateTenantUserInstance(tenantSlug, instanceId, {
          status: 'running',
        }),
      )
    }, TENANT_INSTANCE_RESTART_DURATION_MS)
    restartTimersRef.current.set(instanceId, timeoutId)
  }

  const handleViewDetails = (instance: TenantInstance) => {
    setSelectedInstanceId(instance.id)
    setIsDetailsDrawerOpen(true)
  }

  const handleViewModeChange = (nextViewMode: ViewMode) => {
    setViewMode(nextViewMode)
    setInstancesViewMode(nextViewMode)
  }

  const handleFilterToggle = (serviceId: CatalogServiceId, isSelected: boolean) => {
    setSelectedFilters((current) => toggleCatalogServiceFilter(current, serviceId, isSelected))
  }

  const pageTitle = lockedServiceId
    ? CATALOG_SERVICE_FILTER_LABELS[lockedServiceId]
    : 'Services'
  const pageLede = lockedServiceId
    ? `Monitor and manage ${CATALOG_SERVICE_FILTER_LABELS[lockedServiceId].toLowerCase()} instances provisioned in your project.`
    : 'Monitor and manage instances provisioned in your project.'

  const emptyStateTitle = (() => {
    if (searchValue.trim()) {
      return 'No instances match your search'
    }
    if (lockedServiceId) {
      return `No ${CATALOG_SERVICE_FILTER_LABELS[lockedServiceId]} instances yet`
    }
    if (instances.length === 0) {
      return 'No instances yet'
    }
    if (selectedFilters.size === 0) {
      return 'Select a service to view instances'
    }
    if (selectedFilters.size === 1) {
      const [onlyFilter] = selectedFilters
      return `No ${CATALOG_SERVICE_FILTER_LABELS[onlyFilter!]} instances yet`
    }
    return 'No instances for the selected services'
  })()

  return (
    <>
    <TenantUserInstanceDetailsDrawer
      isExpanded={isDetailsDrawerOpen && selectedInstance !== null}
      onClose={closeDetails}
      instance={isDetailsDrawerOpen ? selectedInstance : null}
      onRequestTerminate={openTerminateConfirm}
      onRestart={handleRestartInstance}
    >
      <div className="tenant-user-workspace-page tenant-user-instances">
        <Title headingLevel="h1" size="3xl" className="tenant-user-instances__title">
          {pageTitle}
        </Title>
        <Content component="p" className="tenant-user-instances__lede">
          {pageLede}
        </Content>

        <div className="catalog-view-toolbar tenant-user-instances__toolbar">
          <div className="catalog-view-toolbar__start">
            {lockedServiceId ? null : (
              <CatalogServiceFilterToggle
                selectedFilters={selectedFilters}
                serviceCounts={serviceCounts}
                onToggle={handleFilterToggle}
                idPrefix="instances-filter-"
                ariaLabel="Instance service filters"
              />
            )}
            <SearchInput
              className="catalog-search"
              placeholder="Search instances"
              value={searchValue}
              onChange={(_event, value) => setSearchValue(value)}
              onClear={() => setSearchValue('')}
              aria-label="Search instances"
            />
          </div>
          {instances.length > 0 ? (
            <ViewModeToggle
              viewMode={viewMode}
              onChange={handleViewModeChange}
              ariaLabel="Services view"
              idPrefix="instances-view"
            />
          ) : null}
        </div>

        {showBackgroundProvisioningNotice ? (
          <Alert
            variant="info"
            isInline
            title={LAUNCH_INSTANCE_WIZARD_DEMO.backgroundProvisioningAlertTitle}
            className="tenant-user-instances__provisioning-alert"
            actionClose={
              onDismissBackgroundProvisioningNotice ? (
                <AlertActionCloseButton
                  onClose={onDismissBackgroundProvisioningNotice}
                  aria-label="Close provisioning notice"
                />
              ) : undefined
            }
          >
            <Content component="p">
              {LAUNCH_INSTANCE_WIZARD_DEMO.backgroundProvisioningAlertBody}
            </Content>
          </Alert>
        ) : null}

        {filteredInstances.length === 0 ? (
          <EmptyState className="tenant-user-instances__empty">
            <span className="tenant-user-instances__empty-icon" aria-hidden>
              {getCatalogServiceIcon('baremetal')}
            </span>
            <Title headingLevel="h2" size="lg">
              {emptyStateTitle}
            </Title>
            <EmptyStateBody>
              {instances.length === 0
                ? 'Launch an instance from the catalog to start provisioning capacity for your project.'
                : selectedFilters.size === 0
                  ? 'Choose one or more services above to filter your instances.'
                  : searchValue.trim()
                    ? 'Try a different search term or clear the search field.'
                    : 'No instances match the selected services.'}
            </EmptyStateBody>
          </EmptyState>
        ) : viewMode === 'grid' ? (
            <div className="catalog-card-grid tenant-user-instances__grid">
              {filteredInstances.map((instance) => {
                const serviceId = getTenantInstanceServiceId(instance)
                const allSpecRows = getTenantInstanceSpecRows(instance)
                // Cards: three highlights for Cluster/VM; Bare Metal shows full hardware rows.
                const cardSpecRows =
                  serviceId === 'baremetal' ? allSpecRows : allSpecRows.slice(0, 3)

                return (
                <Card key={instance.id} isCompact={false} className="tenant-user-instances__card">
                  <CardBody>
                    <div className="tenant-user-instances__card-header">
                      <span className="tenant-user-instances__card-icon" aria-hidden>
                        {getCatalogServiceIcon(serviceId)}
                      </span>
                      <div className="tenant-user-instances__card-header-actions">
                        <InstanceStatusLabel status={instance.status} />
                        <ActionsColumn
                          items={getTenantInstanceActions(
                            instance,
                            openTerminateConfirm,
                            handleViewDetails,
                            handleRestartInstance,
                          )}
                        />
                      </div>
                    </div>

                    <div className="tenant-user-instances__card-title-block">
                      <Content component="p" className="tenant-user-instances__primary-cell">
                        <Button
                          variant="link"
                          isInline
                          className="tenant-user-instances__name-link catalog-item-name-link"
                          onClick={() => handleViewDetails(instance)}
                        >
                          {formatTenantInstanceName(instance.name)}
                        </Button>
                      </Content>
                      <Content component="p" className="tenant-user-instances__secondary-cell">
                        {instance.catalogItemDisplayName}
                      </Content>
                    </div>

                    <CatalogSpecRowsList
                      rows={cardSpecRows}
                      className="tenant-user-catalog__specs-list"
                      rowClassName="tenant-user-catalog__spec-row"
                      labelClassName="tenant-user-catalog__spec-label"
                      valueClassName="tenant-user-catalog__spec-value"
                    />

                    <dl className="tenant-user-instances__card-footer">
                      <div className="tenant-user-instances__card-footer-row">
                        <dt>Created</dt>
                        <dd>{formatTenantInstanceCreatedAt(instance.createdAt)}</dd>
                      </div>
                    </dl>
                  </CardBody>
                </Card>
                )
              })}
            </div>
          ) : (
            <div className="catalog-table-panel">
              <Content component="p" className="catalog-table-result-count">
                {formatCatalogTableResultCount(filteredInstances.length, 'instance')}
              </Content>
              <Table
                aria-label="My instances"
                className="catalog-data-table tenant-user-instances__table"
              >
                <Thead>
                  <Tr>
                    <Th>Name</Th>
                    <Th>Status</Th>
                    <Th>{scopeColumnLabel}</Th>
                    <Th>Profile</Th>
                    <Th>Detail</Th>
                    <Th>Created</Th>
                    <Th screenReaderText="Actions" />
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredInstances.map((instance) => {
                    const tableSpecRows = getTenantInstanceSpecRows(instance)
                    const profileRow = tableSpecRows[0]
                    const detailRow = tableSpecRows[1]

                    return (
                    <Tr key={instance.id}>
                      <Td dataLabel="Name">
                        <Button
                          variant="link"
                          isInline
                          className="catalog-table-name-link"
                          onClick={() => handleViewDetails(instance)}
                        >
                        {formatTenantInstanceName(instance.name)}
                      </Button>
                    </Td>
                    <Td dataLabel="Status">
                      <InstanceStatusLabel status={instance.status} />
                    </Td>
                      <Td dataLabel={getTenantInstanceScopeFieldLabel(instance)}>
                        {instance.projectName}
                      </Td>
                      <Td dataLabel={profileRow?.label ?? 'Profile'}>{profileRow?.value ?? '—'}</Td>
                      <Td dataLabel={detailRow?.label ?? 'Detail'}>{detailRow?.value ?? '—'}</Td>
                      <Td dataLabel="Created">
                        {formatTenantInstanceCreatedAt(instance.createdAt)}
                      </Td>
                      <Td isActionCell>
                        <ActionsColumn
                          items={getTenantInstanceActions(
                            instance,
                            openTerminateConfirm,
                            handleViewDetails,
                            handleRestartInstance,
                          )}
                        />
                      </Td>
                    </Tr>
                    )
                  })}
                </Tbody>
              </Table>
            </div>
          )}
      </div>
    </TenantUserInstanceDetailsDrawer>

      <Modal
        variant={ModalVariant.small}
        isOpen={instancePendingTerminate !== null}
        onClose={closeTerminateConfirm}
        aria-labelledby="terminate-instance-title"
        aria-describedby="terminate-instance-description"
      >
        <ModalHeader
          title="Terminate instance?"
          titleIconVariant="warning"
          labelId="terminate-instance-title"
        />
        <ModalBody>
          <Content component="p" id="terminate-instance-description">
            {instancePendingTerminate ? (
              <>
                <strong>{formatTenantInstanceName(instancePendingTerminate.name)}</strong> will be
                permanently removed. This cannot be undone.
              </>
            ) : (
              'This instance will be permanently removed. This cannot be undone.'
            )}
          </Content>
        </ModalBody>
        <ModalFooter>
          <Button variant="danger" onClick={handleConfirmTerminate}>
            Terminate
          </Button>
          <Button variant="link" onClick={closeTerminateConfirm}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}
