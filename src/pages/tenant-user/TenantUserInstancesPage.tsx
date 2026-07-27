import { useMemo, useState } from 'react'
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
  getTenantInstanceStatusLabel,
  type TenantInstance,
} from '../../tenantUser/instances'
import { LAUNCH_INSTANCE_WIZARD_DEMO } from '../../tenantUser/launchInstanceWizard'
import { removeTenantUserInstance } from '../../tenantUser/storage'

type TenantUserInstancesPageProps = {
  tenantSlug: string
  instances: TenantInstance[]
  onInstancesChange: (instances: TenantInstance[]) => void
  showBackgroundProvisioningNotice?: boolean
  onDismissBackgroundProvisioningNotice?: () => void
}

function getStatusColor(status: TenantInstance['status']): 'green' | 'blue' | 'red' {
  switch (status) {
    case 'running':
      return 'green'
    case 'provisioning':
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
        status === 'provisioning' ? (
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
  showBackgroundProvisioningNotice = false,
  onDismissBackgroundProvisioningNotice,
}: TenantUserInstancesPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => getInstancesViewMode('grid'))
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false)

  const sortedInstances = [...instances].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )

  const selectedInstance = useMemo(
    () => instances.find((instance) => instance.id === selectedInstanceId) ?? null,
    [instances, selectedInstanceId],
  )

  const closeDetails = () => {
    setIsDetailsDrawerOpen(false)
  }

  const handleTerminateInstance = (instanceId: string) => {
    onInstancesChange(removeTenantUserInstance(tenantSlug, instanceId))
    if (selectedInstanceId === instanceId) {
      setSelectedInstanceId(null)
      setIsDetailsDrawerOpen(false)
    }
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
    <TenantUserInstanceDetailsDrawer
      isExpanded={isDetailsDrawerOpen && selectedInstance !== null}
      onClose={closeDetails}
      instance={isDetailsDrawerOpen ? selectedInstance : null}
      onTerminate={handleTerminateInstance}
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
                            handleTerminateInstance,
                            handleViewDetails,
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
                        <dt>Project</dt>
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
                    <Th>Project</Th>
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
                      <Td dataLabel="Project">{instance.projectName}</Td>
                      <Td dataLabel="Hardware">{instance.hardwareProfile}</Td>
                      <Td dataLabel="OS image">{instance.osImage}</Td>
                      <Td dataLabel="Created">
                        {formatTenantInstanceCreatedAt(instance.createdAt)}
                      </Td>
                      <Td isActionCell>
                        <ActionsColumn
                          items={getTenantInstanceActions(
                            instance,
                            handleTerminateInstance,
                            handleViewDetails,
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
  )
}
