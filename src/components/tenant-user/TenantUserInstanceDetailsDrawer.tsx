import { type ReactNode } from 'react'
import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Label,
  Spinner,
  Title,
  Tooltip,
} from '@patternfly/react-core'
import { CheckCircleIcon } from '@patternfly/react-icons/dist/esm/icons/check-circle-icon'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import {
  formatTenantInstanceCreatedAt,
  formatTenantInstanceName,
  getBareMetalInstanceConditions,
  getClusterApiUrl,
  getClusterConsoleUrl,
  getClusterInstanceConditions,
  getClusterStatusLabel,
  getClusterWorkerNodeCount,
  getTenantInstanceScopeFieldLabel,
  getTenantInstanceServiceId,
  getTenantInstanceSpecRows,
  getTenantInstanceStatusLabel,
  getVmInstanceConditions,
  getVmInstanceTypeShortLabel,
  resolveBareMetalSshPublicKey,
  resolveClusterConfig,
  resolveTenantInstanceNetworking,
  resolveVmConfig,
  type TenantInstance,
  type TenantInstanceCondition,
} from '../../tenantUser/instances'

type TenantUserInstanceDetailsDrawerProps = {
  isExpanded: boolean
  onClose: () => void
  instance: TenantInstance | null
  onRequestTerminate: (instance: TenantInstance) => void
  onRestart: (instanceId: string) => void
  onStart?: (instanceId: string) => void
  onStop?: (instanceId: string) => void
  onAttachPublicIp?: (instance: TenantInstance) => void
  children: ReactNode
}

function getStatusColor(status: TenantInstance['status']): 'green' | 'blue' | 'red' | 'grey' {
  switch (status) {
    case 'running':
      return 'green'
    case 'provisioning':
    case 'restarting':
      return 'blue'
    case 'stopped':
      return 'grey'
    case 'failed':
      return 'red'
    default:
      return 'blue'
  }
}

function InstanceStatusLabel({
  status,
  isCluster = false,
}: {
  status: TenantInstance['status']
  isCluster?: boolean
}) {
  return (
    <Label
      color={getStatusColor(status)}
      isCompact
      icon={
        status === 'running' && isCluster ? (
          <CheckCircleIcon />
        ) : status === 'provisioning' || status === 'restarting' ? (
          <Spinner
            isInline
            diameter="0.625rem"
            aria-hidden
            className="tenant-user-instances__status-spinner"
          />
        ) : undefined
      }
    >
      {isCluster ? getClusterStatusLabel(status) : getTenantInstanceStatusLabel(status)}
    </Label>
  )
}

function InstanceConditionsSection({
  conditions,
  ariaLabel,
}: {
  conditions: TenantInstanceCondition[]
  ariaLabel: string
}) {
  return (
    <div className="tenant-user-instances__drawer-section">
      <Content component="p" className="tenant-user-instances__drawer-section-title">
        Conditions
      </Content>
      <ul className="tenant-user-instances__conditions-list" aria-label={ariaLabel}>
        {conditions.map((condition) => {
          const metaParts = [
            condition.reason !== '—' ? condition.reason : null,
            condition.message !== '—' ? condition.message : null,
          ].filter(Boolean)
          const lastTransition = condition.lastTransitionTime
            ? formatTenantInstanceCreatedAt(condition.lastTransitionTime)
            : null

          return (
            <li key={condition.type} className="tenant-user-instances__condition-item">
              <div className="tenant-user-instances__condition-item-header">
                <span className="tenant-user-instances__condition-type-row">
                  <span className="tenant-user-instances__condition-type">{condition.type}</span>
                  {lastTransition ? (
                    <span className="tenant-user-instances__condition-time">{lastTransition}</span>
                  ) : null}
                </span>
                <Label color={condition.status === 'True' ? 'green' : 'grey'} isCompact>
                  {condition.status}
                </Label>
              </div>
              {metaParts.length > 0 ? (
                <Content component="p" className="tenant-user-instances__condition-meta">
                  {metaParts.join(' · ')}
                </Content>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ClusterInstanceDetails({ instance }: { instance: TenantInstance }) {
  const clusterConfig = resolveClusterConfig(instance)
  const workerCount = getClusterWorkerNodeCount(instance)
  const apiUrl = getClusterApiUrl(instance)
  const consoleUrl = getClusterConsoleUrl(instance)

  return (
    <>
      <Content component="p" className="tenant-user-instances__drawer-lede">
        Review cluster endpoints, configuration, and node sets for this instance.
      </Content>

      <Divider className="tenant-user-instances__drawer-divider" />

      <DescriptionList
        isCompact
        className="tenant-user-instances__drawer-dl"
        aria-label="Cluster overview"
      >
        <DescriptionListGroup>
          <DescriptionListTerm>Status</DescriptionListTerm>
          <DescriptionListDescription>
            <InstanceStatusLabel status={instance.status} isCluster />
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Worker nodes</DescriptionListTerm>
          <DescriptionListDescription>{workerCount}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>API URL</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{apiUrl}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Console URL</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{consoleUrl}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>

      <Divider className="tenant-user-instances__drawer-divider" />

      <div className="tenant-user-instances__drawer-section">
        <Content component="p" className="tenant-user-instances__drawer-section-title">
          Cluster configuration
        </Content>
        <DescriptionList
          isCompact
          className="tenant-user-instances__drawer-dl"
          aria-label="Cluster configuration"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>Catalog item</DescriptionListTerm>
            <DescriptionListDescription>
              {clusterConfig.catalogShortName ?? 'ocp-small'}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Release image</DescriptionListTerm>
            <DescriptionListDescription>{clusterConfig.releaseImage}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Pod CIDR</DescriptionListTerm>
            <DescriptionListDescription>{clusterConfig.podCidr}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Service CIDR</DescriptionListTerm>
            <DescriptionListDescription>{clusterConfig.serviceCidr}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Created</DescriptionListTerm>
            <DescriptionListDescription>
              {formatTenantInstanceCreatedAt(instance.createdAt)}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Creator</DescriptionListTerm>
            <DescriptionListDescription>
              {clusterConfig.creator ?? 'Alex Johnson'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </div>

      <Divider className="tenant-user-instances__drawer-divider" />

      <InstanceConditionsSection
        conditions={getClusterInstanceConditions(instance)}
        ariaLabel="Cluster conditions"
      />

      <Divider className="tenant-user-instances__drawer-divider" />

      <div className="tenant-user-instances__drawer-section">
        <Content component="p" className="tenant-user-instances__drawer-section-title">
          Node sets
        </Content>
        <DescriptionList
          isCompact
          className="tenant-user-instances__drawer-dl"
          aria-label="Cluster node sets"
        >
          {clusterConfig.nodeSets.map((nodeSet, index) => (
            <DescriptionListGroup key={nodeSet.id}>
              <DescriptionListTerm>Node set {index + 1}</DescriptionListTerm>
              <DescriptionListDescription>
                {nodeSet.hostType} · {nodeSet.nodeCount}{' '}
                {nodeSet.nodeCount === 1 ? 'node' : 'nodes'}
              </DescriptionListDescription>
            </DescriptionListGroup>
          ))}
        </DescriptionList>
      </div>
    </>
  )
}

function VmInstanceDetails({
  instance,
  onRequestTerminate,
  onRestart,
  onStart,
  onStop,
  onAttachPublicIp,
}: {
  instance: TenantInstance
  onRequestTerminate: (instance: TenantInstance) => void
  onRestart: (instanceId: string) => void
  onStart?: (instanceId: string) => void
  onStop?: (instanceId: string) => void
  onAttachPublicIp?: (instance: TenantInstance) => void
}) {
  const isRunning = instance.status === 'running'
  const isStopped = instance.status === 'stopped'
  const isRestarting = instance.status === 'restarting'
  const isBusy = instance.status === 'provisioning' || isRestarting
  const canStart = isStopped
  const canStop = isRunning
  const canRestart = isRunning || isStopped
  const canDelete = !isBusy
  const vmConfig = resolveVmConfig(instance)
  const hasPublicIp = Boolean(vmConfig.publicIp)
  const canAttachPublicIp = !isBusy && !hasPublicIp
  const conditions = getVmInstanceConditions(instance)

  return (
    <>
      <Content component="p" className="tenant-user-instances__drawer-lede">
        Review virtual machine configuration, networking, and conditions for this instance.
      </Content>

      <div className="tenant-user-instances__drawer-actions">
        {canStart ? (
          <Button variant="secondary" onClick={() => onStart?.(instance.id)}>
            Start
          </Button>
        ) : (
          <Tooltip
            content={
              isRunning
                ? 'Instance is already running'
                : isRestarting
                  ? 'Start is unavailable while restarting'
                  : 'Start is available when the instance is stopped'
            }
          >
            <Button variant="secondary" isAriaDisabled>
              Start
            </Button>
          </Tooltip>
        )}
        {canStop ? (
          <Button variant="secondary" onClick={() => onStop?.(instance.id)}>
            Stop
          </Button>
        ) : (
          <Tooltip
            content={
              isStopped
                ? 'Instance is already stopped'
                : isRestarting
                  ? 'Stop is unavailable while restarting'
                  : 'Stop is available when the instance is running'
            }
          >
            <Button variant="secondary" isAriaDisabled>
              Stop
            </Button>
          </Tooltip>
        )}
        {canRestart ? (
          <Button variant="secondary" onClick={() => onRestart(instance.id)}>
            Restart
          </Button>
        ) : (
          <Tooltip
            content={
              isRestarting
                ? 'Restart is already in progress'
                : 'Restart is available when the instance is running or stopped'
            }
          >
            <Button
              variant="secondary"
              isAriaDisabled
              icon={
                isRestarting ? (
                  <Spinner
                    isInline
                    diameter="0.875rem"
                    aria-hidden
                    className="tenant-user-instances__status-spinner"
                  />
                ) : undefined
              }
            >
              {isRestarting ? 'Restarting…' : 'Restart'}
            </Button>
          </Tooltip>
        )}
        {canDelete ? (
          <Button variant="secondary" isDanger onClick={() => onRequestTerminate(instance)}>
            Delete
          </Button>
        ) : (
          <Tooltip
            content={
              isRestarting
                ? 'Delete is unavailable while restarting'
                : 'Delete is unavailable while provisioning'
            }
          >
            <Button variant="secondary" isDanger isAriaDisabled>
              Delete
            </Button>
          </Tooltip>
        )}
      </div>

      <Divider className="tenant-user-instances__drawer-divider" />

      <DescriptionList
        isCompact
        className="tenant-user-instances__drawer-dl"
        aria-label="Virtual machine summary"
      >
        <DescriptionListGroup>
          <DescriptionListTerm>Status</DescriptionListTerm>
          <DescriptionListDescription>
            <InstanceStatusLabel status={instance.status} />
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Instance type</DescriptionListTerm>
          <DescriptionListDescription>
            {getVmInstanceTypeShortLabel(vmConfig.instanceType)}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Public IP</DescriptionListTerm>
          <DescriptionListDescription>
            {hasPublicIp ? (
              vmConfig.publicIp
            ) : canAttachPublicIp ? (
              <Button
                variant="link"
                isInline
                onClick={() => onAttachPublicIp?.(instance)}
              >
                Attach public IP
              </Button>
            ) : (
              '—'
            )}
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Internal IP</DescriptionListTerm>
          <DescriptionListDescription>{vmConfig.internalIp}</DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>

      <Divider className="tenant-user-instances__drawer-divider" />

      <div className="tenant-user-instances__drawer-section">
        <Content component="p" className="tenant-user-instances__drawer-section-title">
          Details
        </Content>
        <DescriptionList
          isCompact
          className="tenant-user-instances__drawer-dl"
          aria-label="Virtual machine details"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>Catalog item</DescriptionListTerm>
            <DescriptionListDescription>{instance.catalogItemDisplayName}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Name</DescriptionListTerm>
            <DescriptionListDescription>
              {formatTenantInstanceName(instance.name)}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>SSH public key</DescriptionListTerm>
            <DescriptionListDescription>
              {vmConfig.sshPublicKey.trim() ? (
                <code className="tenant-user-instances__ssh-key">{vmConfig.sshPublicKey}</code>
              ) : (
                '—'
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Container Disk Image</DescriptionListTerm>
            <DescriptionListDescription>{vmConfig.containerDiskImage}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Instance type</DescriptionListTerm>
            <DescriptionListDescription>{vmConfig.instanceType}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Boot Disk Size (GiB)</DescriptionListTerm>
            <DescriptionListDescription>{vmConfig.bootDiskSizeGiB} GB</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Created</DescriptionListTerm>
            <DescriptionListDescription>
              {formatTenantInstanceCreatedAt(instance.createdAt)}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </div>

      <Divider className="tenant-user-instances__drawer-divider" />

      <InstanceConditionsSection
        conditions={conditions}
        ariaLabel="Virtual machine conditions"
      />
    </>
  )
}

function DefaultInstanceDetails({
  instance,
  onRequestTerminate,
  onRestart,
  onStart,
  onStop,
}: {
  instance: TenantInstance
  onRequestTerminate: (instance: TenantInstance) => void
  onRestart: (instanceId: string) => void
  onStart?: (instanceId: string) => void
  onStop?: (instanceId: string) => void
}) {
  const isRunning = instance.status === 'running'
  const isStopped = instance.status === 'stopped'
  const isRestarting = instance.status === 'restarting'
  const isBareMetal = getTenantInstanceServiceId(instance) === 'baremetal'
  const canRestart = isBareMetal ? isRunning || isStopped : isRunning
  const canStart = isBareMetal && isStopped
  const canStop = isBareMetal && isRunning
  const canTerminate =
    instance.status !== 'provisioning' && instance.status !== 'restarting'
  const networking = resolveTenantInstanceNetworking(instance)
  const specRows = getTenantInstanceSpecRows(instance)
  const bareMetalConditions = isBareMetal ? getBareMetalInstanceConditions(instance) : []

  return (
    <>
      <Content component="p" className="tenant-user-instances__drawer-lede">
        Review configuration, networking, and lifecycle details for this instance.
      </Content>

      <div className="tenant-user-instances__drawer-actions">
        {isBareMetal ? (
          canStart ? (
            <Button variant="secondary" onClick={() => onStart?.(instance.id)}>
              Start
            </Button>
          ) : (
            <Tooltip
              content={
                isRunning
                  ? 'Instance is already running'
                  : isRestarting
                    ? 'Start is unavailable while restarting'
                    : 'Start is available when the instance is stopped'
              }
            >
              <Button variant="secondary" isAriaDisabled>
                Start
              </Button>
            </Tooltip>
          )
        ) : null}
        {canRestart ? (
          <Button variant="secondary" onClick={() => onRestart(instance.id)}>
            Restart
          </Button>
        ) : (
          <Tooltip
            content={
              isRestarting
                ? 'Restart is already in progress'
                : isBareMetal
                  ? 'Restart is available when the instance is running or stopped'
                  : 'Restart is available when the instance is running'
            }
          >
            <Button
              variant="secondary"
              isAriaDisabled
              icon={
                isRestarting ? (
                  <Spinner
                    isInline
                    diameter="0.875rem"
                    aria-hidden
                    className="tenant-user-instances__status-spinner"
                  />
                ) : undefined
              }
            >
              {isRestarting ? 'Restarting…' : 'Restart'}
            </Button>
          </Tooltip>
        )}
        {isBareMetal ? (
          canStop ? (
            <Button variant="secondary" onClick={() => onStop?.(instance.id)}>
              Stop
            </Button>
          ) : (
            <Tooltip
              content={
                isStopped
                  ? 'Instance is already stopped'
                  : isRestarting
                    ? 'Stop is unavailable while restarting'
                    : 'Stop is available when the instance is running'
              }
            >
              <Button variant="secondary" isAriaDisabled>
                Stop
              </Button>
            </Tooltip>
          )
        ) : null}
        {canTerminate ? (
          <Button variant="secondary" isDanger onClick={() => onRequestTerminate(instance)}>
            Delete
          </Button>
        ) : (
          <Tooltip
            content={
              isRestarting
                ? 'Delete is unavailable while restarting'
                : 'Delete is unavailable while provisioning'
            }
          >
            <Button variant="secondary" isDanger isAriaDisabled>
              Delete
            </Button>
          </Tooltip>
        )}
      </div>

      <Divider className="tenant-user-instances__drawer-divider" />

      <DescriptionList
        isCompact
        className="tenant-user-instances__drawer-dl"
        aria-label="Instance overview"
      >
        <DescriptionListGroup>
          <DescriptionListTerm>Status</DescriptionListTerm>
          <DescriptionListDescription>
            <InstanceStatusLabel status={instance.status} />
          </DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>{getTenantInstanceScopeFieldLabel(instance)}</DescriptionListTerm>
          <DescriptionListDescription>{instance.projectName}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Catalog item</DescriptionListTerm>
          <DescriptionListDescription>{instance.catalogItemDisplayName}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Instance ID</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{instance.id}</code>
          </DescriptionListDescription>
        </DescriptionListGroup>
        {isBareMetal ? (
          <DescriptionListGroup>
            <DescriptionListTerm>SSH public key</DescriptionListTerm>
            <DescriptionListDescription>
              <code className="tenant-user-instances__ssh-key">
                {resolveBareMetalSshPublicKey(instance)}
              </code>
            </DescriptionListDescription>
          </DescriptionListGroup>
        ) : null}
      </DescriptionList>

      <Divider className="tenant-user-instances__drawer-divider" />

      <DescriptionList
        isCompact
        className="tenant-user-instances__drawer-dl"
        aria-label="Instance specifications"
      >
        {specRows.map((row) => (
          <DescriptionListGroup key={row.label}>
            <DescriptionListTerm>{row.label}</DescriptionListTerm>
            <DescriptionListDescription>{row.value}</DescriptionListDescription>
          </DescriptionListGroup>
        ))}
      </DescriptionList>

      <Divider className="tenant-user-instances__drawer-divider" />

      <div className="tenant-user-instances__drawer-section">
        <Content component="p" className="tenant-user-instances__drawer-section-title">
          Networking
        </Content>
        {!networking.enabled ? (
          <Content component="p" className="tenant-user-instances__drawer-lede">
            Networking is off for this catalog item.
          </Content>
        ) : (
          <DescriptionList
            isCompact
            className="tenant-user-instances__drawer-dl"
            aria-label="Instance networking"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>Virtual network</DescriptionListTerm>
              <DescriptionListDescription>
                {networking.virtualNetwork || '—'}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Subnet</DescriptionListTerm>
              <DescriptionListDescription>{networking.subnet || '—'}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Security group</DescriptionListTerm>
              <DescriptionListDescription>
                {networking.securityGroup || '—'}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        )}
      </div>

      {isBareMetal ? (
        <>
          <Divider className="tenant-user-instances__drawer-divider" />

          <InstanceConditionsSection
            conditions={bareMetalConditions}
            ariaLabel="Bare metal conditions"
          />
        </>
      ) : null}

      <Divider className="tenant-user-instances__drawer-divider" />

      <div className="tenant-user-instances__drawer-section">
        <Content component="p" className="tenant-user-instances__drawer-section-title">
          Lifecycle
        </Content>
        <DescriptionList
          isCompact
          className="tenant-user-instances__drawer-dl"
          aria-label="Instance lifecycle"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>Created</DescriptionListTerm>
            <DescriptionListDescription>
              {formatTenantInstanceCreatedAt(instance.createdAt)}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Provisioned</DescriptionListTerm>
            <DescriptionListDescription>
              {instance.provisionedAt
                ? formatTenantInstanceCreatedAt(instance.provisionedAt)
                : instance.status === 'provisioning'
                  ? 'In progress'
                  : '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </div>
    </>
  )
}

export function TenantUserInstanceDetailsDrawer({
  isExpanded,
  onClose,
  instance,
  onRequestTerminate,
  onRestart,
  onStart,
  onStop,
  onAttachPublicIp,
  children,
}: TenantUserInstanceDetailsDrawerProps) {
  const serviceId = instance ? getTenantInstanceServiceId(instance) : 'baremetal'
  const isCluster = serviceId === 'cluster'
  const isVm = serviceId === 'virtual-machine'

  const panelContent = instance ? (
    <DrawerPanelContent
      className="tenant-user-instances__drawer-panel"
      defaultSize="28rem"
      minSize="22rem"
      focusTrap={{ enabled: true }}
    >
      <DrawerHead>
        <div className="tenant-user-instances__drawer-title-row">
          <span className="tenant-user-instances__drawer-icon-wrap" aria-hidden>
            {getCatalogServiceIcon(serviceId)}
          </span>
          <Title
            headingLevel="h2"
            size="xl"
            id="tenant-user-instance-details-title"
            className="tenant-user-instances__drawer-title"
          >
            {formatTenantInstanceName(instance.name)}
          </Title>
        </div>
        <DrawerActions>
          <DrawerCloseButton onClose={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody className="tenant-user-instances__drawer-body">
        {isCluster ? (
          <ClusterInstanceDetails instance={instance} />
        ) : isVm ? (
          <VmInstanceDetails
            instance={instance}
            onRequestTerminate={onRequestTerminate}
            onRestart={onRestart}
            onStart={onStart}
            onStop={onStop}
            onAttachPublicIp={onAttachPublicIp}
          />
        ) : (
          <DefaultInstanceDetails
            instance={instance}
            onRequestTerminate={onRequestTerminate}
            onRestart={onRestart}
            onStart={onStart}
            onStop={onStop}
          />
        )}
      </DrawerPanelBody>
    </DrawerPanelContent>
  ) : null

  return (
    <Drawer isExpanded={isExpanded} onExpand={() => undefined}>
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>{children}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  )
}
