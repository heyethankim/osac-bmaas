import {
  Content,
  EmptyState,
  EmptyStateBody,
  Label,
  Title,
} from '@patternfly/react-core'
import { CubesIcon } from '@patternfly/react-icons/dist/esm/icons/cubes-icon'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import {
  formatTenantInstanceCreatedAt,
  getTenantInstanceActions,
  getTenantInstanceStatusLabel,
  type TenantInstance,
} from '../../tenantUser/instances'
import { removeTenantUserInstance } from '../../tenantUser/storage'

type TenantUserInstancesPageProps = {
  tenantSlug: string
  instances: TenantInstance[]
  onInstancesChange: (instances: TenantInstance[]) => void
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

export function TenantUserInstancesPage({
  tenantSlug,
  instances,
  onInstancesChange,
}: TenantUserInstancesPageProps) {
  const sortedInstances = [...instances].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )

  const handleTerminateInstance = (instanceId: string) => {
    onInstancesChange(removeTenantUserInstance(tenantSlug, instanceId))
  }

  return (
    <div className="tenant-user-workspace-page tenant-user-instances">
      <Title headingLevel="h1" size="3xl" className="tenant-user-instances__title">
        My instances
      </Title>
      <Content component="p" className="tenant-user-instances__lede">
        Monitor and manage bare metal instances provisioned in your project.
      </Content>

      {sortedInstances.length > 0 ? (
        <Table
          aria-label="My instances"
          variant="compact"
          borders={false}
          className="tenant-user-instances__table"
        >
          <Thead>
            <Tr>
              <Th modifier="wrap">Instance</Th>
              <Th modifier="wrap">Catalog item</Th>
              <Th modifier="wrap">Hardware</Th>
              <Th modifier="wrap">OS image</Th>
              <Th modifier="wrap">Status</Th>
              <Th modifier="wrap">Created</Th>
              <Th screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody>
            {sortedInstances.map((instance) => (
              <Tr key={instance.id}>
                <Td dataLabel="Instance">
                  <Content component="p" className="tenant-user-instances__primary-cell">
                    {instance.name}
                  </Content>
                  <Content component="p" className="tenant-user-instances__secondary-cell">
                    {instance.projectName}
                  </Content>
                </Td>
                <Td dataLabel="Catalog item">{instance.catalogItemDisplayName}</Td>
                <Td dataLabel="Hardware">{instance.hardwareProfile}</Td>
                <Td dataLabel="OS image">{instance.osImage}</Td>
                <Td dataLabel="Status">
                  <Label color={getStatusColor(instance.status)} isCompact>
                    {getTenantInstanceStatusLabel(instance.status)}
                  </Label>
                </Td>
                <Td dataLabel="Created">{formatTenantInstanceCreatedAt(instance.createdAt)}</Td>
                <Td isActionCell>
                  <ActionsColumn
                    items={getTenantInstanceActions(instance, handleTerminateInstance)}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      ) : (
        <EmptyState className="tenant-user-instances__empty">
          <CubesIcon className="tenant-user-instances__empty-icon" />
          <Title headingLevel="h2" size="lg">
            No instances yet
          </Title>
          <EmptyStateBody>
            Launch an instance from the catalog to start provisioning bare metal capacity for your
            project.
          </EmptyStateBody>
        </EmptyState>
      )}
    </div>
  )
}
