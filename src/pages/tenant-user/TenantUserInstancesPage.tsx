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
  Spinner,
  Title,
} from '@patternfly/react-core'
import { ServerIcon } from '@patternfly/react-icons/dist/esm/icons/server-icon'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { ViewModeToggle } from '../../components/catalog/CatalogViewToggle'
import { TenantUserInstanceDetailsDrawer } from '../../components/tenant-user/TenantUserInstanceDetailsDrawer'
import { formatCatalogTableResultCount } from '../../catalog/tableResultCount'
import {
  getInstancesViewMode,
  setInstancesViewMode,
  type ViewMode,
} from '../../catalog/viewMode'
import {
  formatTenantInstanceCreatedAt,
  formatTenantInstanceName,
  getTenantInstanceActions,
  getTenantInstanceScopeFieldLabel,
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
  showBackgroundProvisioningNotice = false,
  onDismissBackgroundProvisioningNotice,
}: TenantUserInstancesPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => getInstancesViewMode('grid'))
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false)
  const [instancePendingTerminate, setInstancePendingTerminate] = useState<TenantInstance | null>(
    null,
  )
  const restartTimersRef = useRef<Map<string, number>>(new Map())

  const scopeColumnLabel = useMemo(() => {
    if (instances.length === 0) {
      return defaultScopeFieldLabel
    }
    const labels = new Set(
      instances.map((instance) => getTenantInstanceScopeFieldLabel(instance)),
    )
    return labels.size === 1 ? [...labels][0] : 'Scope'
  }, [defaultScopeFieldLabel, instances])

  const sortedInstances = [...instances].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )
  const selectedInstance = useMemo(
    () => instances.find((instance) => instance.id === selectedInstanceId) ?? null,
    [instances, selectedInstanceId],
  )

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
        <div className="catalog-view-toolbar tenant-user-instances__toolbar">
          <div className="catalog-view-toolbar__start">
            <Title headingLevel="h1" size="3xl" className="tenant-user-instances__title">
              My instances
            </Title>
          </div>
          {sortedInstances.length > 0 ? (
            <ViewModeToggle
              viewMode={viewMode}
              onChange={handleViewModeChange}
              ariaLabel="My instances view"
              idPrefix="instances-view"
            />
          ) : null}
        </div>
        <Content component="p" className="tenant-user-instances__lede">
          Monitor and manage instances provisioned in your project.
        </Content>

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

        {sortedInstances.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="catalog-card-grid tenant-user-instances__grid">
              {sortedInstances.map((instance) => (
                <Card key={instance.id} isCompact className="tenant-user-instances__card">
                  <CardBody>
                    <div className="tenant-user-instances__card-header">
                      <span className="tenant-user-instances__card-icon" aria-hidden>
                        <ServerIcon />
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

                    <dl className="tenant-user-instances__card-specs">
                      <div className="tenant-user-instances__card-spec">
                        <dt>Hardware</dt>
                        <dd>{instance.hardwareProfile}</dd>
                      </div>
                      <div className="tenant-user-instances__card-spec">
                        <dt>OS image</dt>
                        <dd>{instance.osImage}</dd>
                      </div>
                      <div className="tenant-user-instances__card-spec">
                        <dt>GPU</dt>
                        <dd>{instance.gpuLabel}</dd>
                      </div>
                    </dl>

                    <dl className="tenant-user-instances__card-footer">
                      <div className="tenant-user-instances__card-footer-row">
                        <dt>{getTenantInstanceScopeFieldLabel(instance)}</dt>
                        <dd>{instance.projectName}</dd>
                      </div>
                      <div className="tenant-user-instances__card-footer-row">
                        <dt>Created</dt>
                        <dd>{formatTenantInstanceCreatedAt(instance.createdAt)}</dd>
                      </div>
                    </dl>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : (
            <div className="catalog-table-panel">
              <Content component="p" className="catalog-table-result-count">
                {formatCatalogTableResultCount(sortedInstances.length, 'instance')}
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
                    <Th>Hardware</Th>
                    <Th>OS image</Th>
                    <Th>Created</Th>
                    <Th screenReaderText="Actions" />
                  </Tr>
                </Thead>
                <Tbody>
                  {sortedInstances.map((instance) => (
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
                      <Td dataLabel="Hardware">{instance.hardwareProfile}</Td>
                      <Td dataLabel="OS image">{instance.osImage}</Td>
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
                  ))}
                </Tbody>
              </Table>
            </div>
          )
        ) : (
          <EmptyState className="tenant-user-instances__empty">
            <ServerIcon className="tenant-user-instances__empty-icon" />
            <Title headingLevel="h2" size="lg">
              No instances yet
            </Title>
            <EmptyStateBody>
              Launch an instance from the catalog to start provisioning capacity for your project.
            </EmptyStateBody>
          </EmptyState>
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
