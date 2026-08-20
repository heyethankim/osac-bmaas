import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  ClipboardCopy,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Spinner,
  Title,
  Tooltip,
} from '@patternfly/react-core'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { EntityDetailsPageShell } from '../shared/EntityDetailsPageShell'
import { CatalogClusterVersionValue } from '../catalog/CatalogClusterVersionValue'
import { CatalogDiskImageValue } from '../catalog/CatalogDiskImageValue'
import { CatalogNetworkingLocksSection } from '../catalog/CatalogNetworkingLocksSection'
import { CatalogNetworkingSummarySection } from '../catalog/CatalogNetworkingSummarySection'
import { getCatalogServiceIcon } from '../../catalog/serviceIcons'
import {
  getCatalogNetworkOptionLabel,
  type CatalogNetworkPolicy,
} from '../../providerAdmin/catalogNetworkPolicy'
import { getProviderCatalogItems } from '../../providerSetup/storage'
import { resolveNetworkInventoryScope } from '../../shared/networkInventoryScope'
import { getWorkspaceOrganization } from '../../tenantAdmin/organizations'
import {
  formatTenantInstanceCreatedAt,
  formatTenantInstanceName,
  downloadClusterKubeconfig,
  getBareMetalInstanceConditions,
  getBareMetalSerialConsoleUrl,
  getBareMetalSshCommand,
  getBareMetalSshHost,
  getClusterApiUrl,
  getClusterConsoleUrl,
  getClusterDesiredVersionLabel,
  getVmConsoleUrl,
  getClusterInstanceConditions,
  getClusterNodeSetsWithDefaults,
  getClusterPlatformLabel,
  getClusterStatusLabel,
  getClusterUpgradeStatus,
  getClusterVersionShortLabel,
  getTenantInstanceProjectIds,
  getTenantInstanceServiceId,
  getTenantInstanceSpecRows,
  getTenantInstanceStatusLabel,
  getVmInstanceConditions,
  getVmInstanceTypeShortLabel,
  getTenantInstanceCardSpecRows,
  resolveBareMetalInventory,
  resolveBareMetalSshPublicKey,
  resolveClusterConfig,
  resolveClusterNodeInventories,
  resolveTenantInstanceNetworking,
  resolveVmConfig,
  type TenantClusterNodeInventory,
  type TenantClusterNodeSetStatus,
  type TenantClusterUpgradeStatus,
  type TenantInstance,
  type TenantInstanceCondition,
  type TenantInstanceNetworking,
  type TenantMachineInventory,
  type TenantNetworkInterfaceInventory,
} from '../../tenantUser/instances'
import {
  formatInstanceNetworkLabel,
  matchNetworkOptionId,
  resolveLaunchNetworkContext,
} from '../../tenantUser/launchNetworking'
import type { TenantProject } from '../../tenantAdmin/projects'
import {
  getTenantProjectEnvironmentLabel,
  getTenantProjectMemberCountLabel,
} from '../../tenantAdmin/projects'

type TenantUserInstanceDetailsPageProps = {
  instance: TenantInstance
  tenantSlug: string
  projects: readonly TenantProject[]
  onBack: () => void
  onRequestTerminate: (instance: TenantInstance) => void
  onRestart: (instanceId: string) => void
  onStart?: (instanceId: string) => void
  onStop?: (instanceId: string) => void
  onAttachPublicIp?: (instance: TenantInstance) => void
  onUpdateNetworking?: (
    instanceId: string,
    networking: TenantInstanceNetworking,
    networkLabel: string,
  ) => void
  onNavigateToProject?: (project: TenantProject) => void
  /** Opens the matching catalog item detail page in Catalog. */
  onNavigateToCatalogItem?: (catalogItemDisplayName: string) => void
  /** Opens the cluster demo password modal. */
  onViewPassword?: (instance: TenantInstance) => void
  /** Provider admin Services detail shows assigned objects only; tenant views keep lock controls. */
  instanceNetworkingVariant?: 'interactive' | 'summary'
}

function CatalogItemDisplayLink({
  displayName,
  onNavigate,
}: {
  displayName: string
  onNavigate?: (catalogItemDisplayName: string) => void
}) {
  if (!onNavigate) {
    return <>{displayName}</>
  }

  return (
    <Button
      variant="link"
      isInline
      className="provider-admin-catalog-items__inline-link"
      onClick={() => onNavigate(displayName)}
    >
      {displayName}
    </Button>
  )
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
    <div className="entity-details-page__column-block">
      <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
        Conditions
      </Title>
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
              <div className="tenant-user-instances__condition-item-body">
                <div className="tenant-user-instances__condition-type-row">
                  <span className="tenant-user-instances__condition-type">{condition.type}</span>
                  {lastTransition ? (
                    <span className="tenant-user-instances__condition-time">{lastTransition}</span>
                  ) : null}
                </div>
                {metaParts.length > 0 ? (
                  <Content component="p" className="tenant-user-instances__condition-meta">
                    {metaParts.join(' · ')}
                  </Content>
                ) : null}
              </div>
              <Label color={condition.status === 'True' ? 'green' : 'grey'} isCompact>
                {condition.status}
              </Label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function NetworkInterfaceInventoryList({
  interfaces,
  ariaLabel,
}: {
  interfaces: TenantNetworkInterfaceInventory[]
  ariaLabel: string
}) {
  return (
    <DescriptionList
      isCompact
      className="tenant-user-instances__drawer-dl tenant-user-instances__inventory-dl"
      aria-label={ariaLabel}
    >
      {interfaces.map((networkInterface) => (
        <DescriptionListGroup key={networkInterface.id}>
          <DescriptionListTerm>{networkInterface.name}</DescriptionListTerm>
          <DescriptionListDescription>
            <code>{networkInterface.macAddress}</code>
            <span className="tenant-user-instances__inventory-nic-meta">
              {' '}
              · {networkInterface.speed}
            </span>
          </DescriptionListDescription>
        </DescriptionListGroup>
      ))}
    </DescriptionList>
  )
}

function BareMetalInventorySection({
  inventory,
  embedded = false,
}: {
  inventory: TenantMachineInventory | null
  /** When true, render inside a config column (gray panel). */
  embedded?: boolean
}) {
  const title = embedded ? (
    <Title
      headingLevel="h2"
      size="md"
      className="entity-details-page__section-title entity-details-page__section-title--config"
    >
      Inventory
    </Title>
  ) : (
    <Content component="p" className="tenant-user-instances__drawer-section-title">
      Inventory
    </Content>
  )

  const body = inventory ? (
    <>
      <Content component="p" className="tenant-user-instances__drawer-lede">
        Machine-specific network interfaces assigned after this host was provisioned.
      </Content>
      <NetworkInterfaceInventoryList
        interfaces={inventory.networkInterfaces}
        ariaLabel="Bare metal network interface inventory"
      />
    </>
  ) : (
    <Content component="p" className="tenant-user-instances__drawer-lede">
      MAC addresses are assigned when this machine finishes provisioning.
    </Content>
  )

  if (embedded) {
    return (
      <div className="entity-details-page__column-block">
        {title}
        {body}
      </div>
    )
  }

  return (
    <div className="tenant-user-instances__drawer-section">
      {title}
      {body}
    </div>
  )
}

function ClusterInventorySection({
  nodes,
  isProvisioning,
  embedded = false,
}: {
  nodes: TenantClusterNodeInventory[]
  isProvisioning: boolean
  embedded?: boolean
}) {
  const title = embedded ? (
    <Title
      headingLevel="h2"
      size="md"
      className="entity-details-page__section-title entity-details-page__section-title--config"
    >
      Inventory
    </Title>
  ) : (
    <Content component="p" className="tenant-user-instances__drawer-section-title">
      Inventory
    </Content>
  )

  const body =
    isProvisioning || nodes.length === 0 ? (
      <Content component="p" className="tenant-user-instances__drawer-lede">
        MAC addresses for each node NIC are assigned when hosts finish provisioning.
      </Content>
    ) : (
      <>
        <Content component="p" className="tenant-user-instances__drawer-lede">
          Machine-specific network interfaces for allocated cluster nodes.
        </Content>
        <div className="tenant-user-instances__inventory-nodes">
          {nodes.map((node) => (
            <div key={node.id} className="tenant-user-instances__inventory-node">
              <Content component="p" className="tenant-user-instances__inventory-node-title">
                {node.name}
                <span className="tenant-user-instances__inventory-node-meta">
                  {' '}
                  · {node.hostType}
                </span>
              </Content>
              <NetworkInterfaceInventoryList
                interfaces={node.networkInterfaces}
                ariaLabel={`Network interfaces for ${node.name}`}
              />
            </div>
          ))}
        </div>
      </>
    )

  if (embedded) {
    return (
      <div className="entity-details-page__column-block">
        {title}
        {body}
      </div>
    )
  }

  return (
    <div className="tenant-user-instances__drawer-section">
      {title}
      {body}
    </div>
  )
}

function findCatalogDraftForInstance(instance: TenantInstance) {
  const items = getProviderCatalogItems()
  return (
    items.find((item) => item.displayName === instance.catalogItemDisplayName) ??
    items.find((item) =>
      item.displayName.toLowerCase().includes(instance.catalogItemDisplayName.toLowerCase()),
    ) ??
    null
  )
}

function buildInstanceNetworkPolicy(
  instance: TenantInstance,
  catalogPolicy: CatalogNetworkPolicy,
  tenantSlug: string,
): CatalogNetworkPolicy {
  const inventory = resolveNetworkInventoryScope(tenantSlug)
  const networking = resolveTenantInstanceNetworking(instance)
  const virtualNetworkOptions = inventory.getVirtualNetworkOptions()
  const virtualNetworkId = matchNetworkOptionId(
    virtualNetworkOptions,
    networking.virtualNetwork || catalogPolicy.virtualNetwork.name,
  )
  const subnetOptions = inventory.getSubnetOptions(virtualNetworkId)
  const subnetId = matchNetworkOptionId(
    subnetOptions,
    networking.subnet || catalogPolicy.subnet.name,
  )
  const securityGroupOptions = inventory.getSecurityGroupOptions()
  const securityGroupId = matchNetworkOptionId(
    securityGroupOptions,
    networking.securityGroup || catalogPolicy.securityGroup.name,
  )
  const externalIpPoolOptions = inventory.getExternalIpPoolOptions()
  const externalIpPoolId =
    externalIpPoolOptions.find((option) => option.id === catalogPolicy.externalIpPool.id)?.id ??
    externalIpPoolOptions[0]?.id ??
    catalogPolicy.externalIpPool.id

  return {
    enabled: true,
    virtualNetwork: {
      id: virtualNetworkId,
      name:
        virtualNetworkOptions.find((option) => option.id === virtualNetworkId)?.name ??
        catalogPolicy.virtualNetwork.name,
      locked: false,
    },
    subnet: {
      id: subnetId,
      name:
        subnetOptions.find((option) => option.id === subnetId)?.name ?? catalogPolicy.subnet.name,
      locked: false,
    },
    securityGroup: {
      id: securityGroupId,
      name:
        securityGroupOptions.find((option) => option.id === securityGroupId)?.name ??
        catalogPolicy.securityGroup.name,
      locked: false,
    },
    externalIpPool: {
      id: externalIpPoolId,
      name:
        externalIpPoolOptions.find((option) => option.id === externalIpPoolId)?.name ??
        catalogPolicy.externalIpPool.name,
      locked: false,
    },
  }
}

function InstanceInheritedNetworkingSection({
  instance,
  tenantSlug,
  onUpdateNetworking,
  conditions,
  conditionsAriaLabel,
  networkingVariant = 'summary',
}: {
  instance: TenantInstance
  tenantSlug: string
  onUpdateNetworking?: (
    instanceId: string,
    networking: TenantInstanceNetworking,
    networkLabel: string,
  ) => void
  conditions?: TenantInstanceCondition[]
  conditionsAriaLabel?: string
  networkingVariant?: 'interactive' | 'summary'
}) {
  const organization = getWorkspaceOrganization(tenantSlug)
  const inventory = resolveNetworkInventoryScope(tenantSlug)
  const catalogDraft = findCatalogDraftForInstance(instance)
  const networkContext = resolveLaunchNetworkContext(
    organization,
    catalogDraft,
    true,
    catalogDraft?.catalogItemId,
  )
  const [policy, setPolicy] = useState<CatalogNetworkPolicy | null>(() =>
    networkContext.enabled
      ? buildInstanceNetworkPolicy(instance, networkContext.policy, tenantSlug)
      : null,
  )
  const [subnetOptions, setSubnetOptions] = useState(() =>
    inventory.getSubnetOptions(policy?.virtualNetwork.id),
  )

  useEffect(() => {
    if (!networkContext.enabled) {
      setPolicy(null)
      return
    }
    const next = buildInstanceNetworkPolicy(instance, networkContext.policy, tenantSlug)
    setPolicy(next)
    setSubnetOptions(inventory.getSubnetOptions(next.virtualNetwork.id))
  }, [instance.id, instance.networking, networkContext.enabled, catalogDraft?.catalogItemId, tenantSlug])

  if (!networkContext.enabled || !policy) {
    return conditions && conditions.length > 0 && conditionsAriaLabel ? (
      <InstanceConditionsSection conditions={conditions} ariaLabel={conditionsAriaLabel} />
    ) : null
  }

  if (networkingVariant === 'summary') {
    return (
      <>
        <CatalogNetworkingSummarySection
          policy={policy}
          virtualNetworkOptions={inventory.getVirtualNetworkOptions()}
          subnetOptions={subnetOptions}
          securityGroupOptions={inventory.getSecurityGroupOptions()}
          externalIpPoolOptions={inventory.getExternalIpPoolOptions()}
        />
        {conditions && conditions.length > 0 && conditionsAriaLabel ? (
          <div className="entity-details-page__conditions-band">
            <InstanceConditionsSection conditions={conditions} ariaLabel={conditionsAriaLabel} />
          </div>
        ) : null}
      </>
    )
  }

  const persistFromPolicy = (next: CatalogNetworkPolicy) => {
    setPolicy(next)

    const vn = inventory.getVirtualNetworkOptions().find((o) => o.id === next.virtualNetwork.id)
    const sn = inventory.getSubnetOptions(next.virtualNetwork.id).find((o) => o.id === next.subnet.id)
    const sg = inventory.getSecurityGroupOptions().find((o) => o.id === next.securityGroup.id)
    if (!vn || !sn || !sg) {
      return
    }

    const nextNetworking: TenantInstanceNetworking = {
      enabled: true,
      virtualNetwork: getCatalogNetworkOptionLabel(vn),
      subnet: getCatalogNetworkOptionLabel(sn),
      securityGroup: getCatalogNetworkOptionLabel(sg),
    }
    onUpdateNetworking?.(
      instance.id,
      nextNetworking,
      formatInstanceNetworkLabel(nextNetworking),
    )
  }

  const handleVirtualNetworkChange = (value: string, nextBase: CatalogNetworkPolicy) => {
    const nextSubnets = inventory.getSubnetOptions(value)
    setSubnetOptions(nextSubnets)
    const nextSubnetId =
      nextSubnets.find((option) => option.id === nextBase.subnet.id)?.id ??
      nextSubnets[0]?.id ??
      nextBase.subnet.id
    persistFromPolicy({
      ...nextBase,
      virtualNetwork: {
        ...nextBase.virtualNetwork,
        id: value,
        name:
          inventory.getVirtualNetworkOptions().find((option) => option.id === value)?.name ??
          nextBase.virtualNetwork.name,
        locked: false,
      },
      subnet: {
        ...nextBase.subnet,
        id: nextSubnetId,
        name:
          nextSubnets.find((option) => option.id === nextSubnetId)?.name ?? nextBase.subnet.name,
        locked: false,
      },
    })
  }

  return (
    <section
      className="entity-details-page__column entity-details-page__column--span-2"
      aria-label="Networking"
    >
      <CatalogNetworkingLocksSection
        idPrefix={`instance-networking-${instance.id}`}
        policy={policy}
        locksReadOnly
        lede="Choose networking resources from your organization's inventory."
        ledeDescription="Networking options are managed under Networking in your workspace."
        virtualNetworkOptions={inventory.getVirtualNetworkOptions()}
        subnetOptions={subnetOptions}
        securityGroupOptions={inventory.getSecurityGroupOptions()}
        externalIpPoolOptions={inventory.getExternalIpPoolOptions()}
        onVirtualNetworkChange={handleVirtualNetworkChange}
        onChange={persistFromPolicy}
      />
      {conditions && conditions.length > 0 && conditionsAriaLabel ? (
        <div className="entity-details-page__conditions-band">
          <InstanceConditionsSection conditions={conditions} ariaLabel={conditionsAriaLabel} />
        </div>
      ) : null}
    </section>
  )
}

function ClusterLifecycleActions({
  instance,
  onRequestTerminate,
  onViewPassword,
}: {
  instance: TenantInstance
  onRequestTerminate: (instance: TenantInstance) => void
  onViewPassword?: (instance: TenantInstance) => void
}) {
  const isRunning = instance.status === 'running'
  const isBusy = instance.status === 'provisioning' || instance.status === 'restarting'
  const canDelete = !isBusy
  const consoleUrl = getClusterConsoleUrl(instance)

  const openConsole = () => {
    window.open(consoleUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {isRunning ? (
        <Button variant="primary" onClick={openConsole}>
          Console
        </Button>
      ) : (
        <Tooltip content="Console is available when the cluster is ready">
          <Button variant="primary" isAriaDisabled>
            Console
          </Button>
        </Tooltip>
      )}
      {isRunning ? (
        <Button variant="secondary" onClick={() => downloadClusterKubeconfig(instance)}>
          Download kubeconfig
        </Button>
      ) : (
        <Tooltip content="Kubeconfig is available when the cluster is ready">
          <Button variant="secondary" isAriaDisabled>
            Download kubeconfig
          </Button>
        </Tooltip>
      )}
      {isRunning ? (
        <Button variant="secondary" onClick={() => onViewPassword?.(instance)}>
          View password
        </Button>
      ) : (
        <Tooltip content="Password is available when the cluster is ready">
          <Button variant="secondary" isAriaDisabled>
            View password
          </Button>
        </Tooltip>
      )}
      {canDelete ? (
        <Button variant="secondary" isDanger onClick={() => onRequestTerminate(instance)}>
          Delete
        </Button>
      ) : (
        <Tooltip content="Delete is unavailable while provisioning">
          <Button variant="secondary" isDanger isAriaDisabled>
            Delete
          </Button>
        </Tooltip>
      )}
    </>
  )
}

function VmLifecycleActions({
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
  const isBusy = instance.status === 'provisioning' || isRestarting
  const canStart = isStopped
  const canStop = isRunning
  const canRestart = isRunning || isStopped
  const canDelete = !isBusy
  const consoleUrl = getVmConsoleUrl(instance)

  const openConsole = () => {
    window.open(consoleUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {isRunning ? (
        <Button variant="primary" onClick={openConsole}>
          Console
        </Button>
      ) : (
        <Tooltip content="Console is available when the instance is running">
          <Button variant="primary" isAriaDisabled>
            Console
          </Button>
        </Tooltip>
      )}
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
    </>
  )
}

export function BareMetalConnectSshModal({
  instance,
  isOpen,
  onClose,
}: {
  instance: TenantInstance | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!instance) {
    return null
  }

  const host = getBareMetalSshHost(instance)
  const command = getBareMetalSshCommand(instance)

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="bare-metal-ssh-modal-title"
    >
      <ModalHeader title="Connect via SSH" labelId="bare-metal-ssh-modal-title" />
      <ModalBody>
        <Content component="p">
          Use the SSH public key from launch to connect to this host when it is running.
        </Content>
        <DescriptionList isCompact className="entity-details-page__dl" aria-label="SSH connection">
          <DescriptionListGroup>
            <DescriptionListTerm>Host</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{host}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Command</DescriptionListTerm>
            <DescriptionListDescription>
              <ClipboardCopy
                isReadOnly
                isCode
                hoverTip="Copy SSH command"
                clickTip="SSH command copied"
                textAriaLabel="SSH connect command"
              >
                {command}
              </ClipboardCopy>
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  )
}

function BareMetalLifecycleActions({
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
  const [isSshModalOpen, setIsSshModalOpen] = useState(false)
  const isRunning = instance.status === 'running'
  const isStopped = instance.status === 'stopped'
  const isRestarting = instance.status === 'restarting'
  const canStart = isStopped
  const canStop = isRunning
  const canRestart = isRunning || isStopped
  const canTerminate = instance.status !== 'provisioning' && instance.status !== 'restarting'

  return (
    <>
      {isRunning ? (
        <Button variant="primary" onClick={() => setIsSshModalOpen(true)}>
          Connect via SSH
        </Button>
      ) : (
        <Tooltip content="SSH is available when the instance is running">
          <Button variant="primary" isAriaDisabled>
            Connect via SSH
          </Button>
        </Tooltip>
      )}
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
      <BareMetalConnectSshModal
        instance={instance}
        isOpen={isSshModalOpen}
        onClose={() => setIsSshModalOpen(false)}
      />
    </>
  )
}

function DefaultLifecycleActions({
  instance,
  onRequestTerminate,
  onRestart,
}: {
  instance: TenantInstance
  onRequestTerminate: (instance: TenantInstance) => void
  onRestart: (instanceId: string) => void
  onStart?: (instanceId: string) => void
  onStop?: (instanceId: string) => void
}) {
  const isRunning = instance.status === 'running'
  const isRestarting = instance.status === 'restarting'
  const canRestart = isRunning
  const canTerminate =
    instance.status !== 'provisioning' && instance.status !== 'restarting'

  return (
    <>
      {canRestart ? (
        <Button variant="secondary" onClick={() => onRestart(instance.id)}>
          Restart
        </Button>
      ) : (
        <Tooltip
          content={
            isRestarting
              ? 'Restart is already in progress'
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
    </>
  )
}

function getClusterUpgradeStatusLabel(status: TenantClusterUpgradeStatus): string {
  switch (status) {
    case 'upgrade-available':
      return 'Upgrade available'
    case 'upgrading':
      return 'Upgrading'
    case 'up-to-date':
    default:
      return 'Up to date'
  }
}

function getClusterUpgradeStatusColor(
  status: TenantClusterUpgradeStatus,
): 'green' | 'blue' | 'orange' | 'grey' {
  switch (status) {
    case 'upgrade-available':
      return 'orange'
    case 'upgrading':
      return 'blue'
    case 'up-to-date':
    default:
      return 'green'
  }
}

function getNodeSetStatusLabel(status: TenantClusterNodeSetStatus): string {
  switch (status) {
    case 'updating':
      return 'Updating'
    case 'behind':
      return 'Behind'
    case 'pending':
      return 'Pending'
    case 'ready':
    default:
      return 'Ready'
  }
}

function getNodeSetStatusColor(
  status: TenantClusterNodeSetStatus,
): 'green' | 'blue' | 'orange' | 'grey' {
  switch (status) {
    case 'updating':
      return 'blue'
    case 'behind':
      return 'orange'
    case 'pending':
      return 'grey'
    case 'ready':
    default:
      return 'green'
  }
}

function ClusterInstancePageBody({
  instance,
  tenantSlug,
  projects,
  onUpdateNetworking,
  onNavigateToProject,
  onNavigateToCatalogItem,
  instanceNetworkingVariant,
}: {
  instance: TenantInstance
  tenantSlug: string
  projects: readonly TenantProject[]
  onUpdateNetworking?: (
    instanceId: string,
    networking: TenantInstanceNetworking,
    networkLabel: string,
  ) => void
  onNavigateToProject?: (project: TenantProject) => void
  onNavigateToCatalogItem?: (catalogItemDisplayName: string) => void
  instanceNetworkingVariant?: 'interactive' | 'summary'
}) {
  const clusterConfig = resolveClusterConfig(instance)
  const apiUrl = getClusterApiUrl(instance)
  const consoleUrl = getClusterConsoleUrl(instance)
  const inventoryNodes = resolveClusterNodeInventories(instance)
  const isProvisioning = instance.status === 'provisioning'
  const upgradeStatus = getClusterUpgradeStatus(instance)
  const desiredVersion = getClusterDesiredVersionLabel(instance)
  const nodeSets = getClusterNodeSetsWithDefaults(instance)

  return (
    <>
      <div className="entity-details-page__columns entity-details-page__columns--with-rail">
        <div className="entity-details-page__main-stack">
          <div className="entity-details-page__columns entity-details-page__columns--2">
            <div className="entity-details-page__column">
              <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                Overview
              </Title>
              <DescriptionList
                isCompact
                className="entity-details-page__dl"
                aria-label="Cluster overview"
              >
                <DescriptionListGroup>
                  <DescriptionListTerm>Status</DescriptionListTerm>
                  <DescriptionListDescription>
                    <InstanceStatusLabel status={instance.status} isCluster />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Catalog item</DescriptionListTerm>
                  <DescriptionListDescription>
                    <CatalogItemDisplayLink
                      displayName={instance.catalogItemDisplayName}
                      onNavigate={onNavigateToCatalogItem}
                    />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {instance.description?.trim() ? (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Description</DescriptionListTerm>
                    <DescriptionListDescription>
                      {instance.description.trim()}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                ) : null}
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
            </div>

            <div className="entity-details-page__column">
              <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                Lifecycle
              </Title>
              <DescriptionList
                isCompact
                className="entity-details-page__dl"
                aria-label="Cluster lifecycle"
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
                <DescriptionListGroup>
                  <DescriptionListTerm>Creator</DescriptionListTerm>
                  <DescriptionListDescription>
                    {clusterConfig.creator ?? 'Alex Johnson'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>
          </div>

          <InstanceProjectsSection
            instance={instance}
            projects={projects}
            onNavigateToProject={onNavigateToProject}
          />

          <InstanceInheritedNetworkingSection
            instance={instance}
            tenantSlug={tenantSlug}
            onUpdateNetworking={onUpdateNetworking}
            conditions={getClusterInstanceConditions(instance)}
            conditionsAriaLabel="Cluster conditions"
            networkingVariant={instanceNetworkingVariant}
          />
        </div>

        <div className="entity-details-page__rail-stack">
          <div className="entity-details-page__column entity-details-page__column--config">
            <div className="entity-details-page__column-block">
              <Title
                headingLevel="h2"
                size="md"
                className="entity-details-page__section-title entity-details-page__section-title--config"
              >
                Cluster version
              </Title>
            <DescriptionList
              isCompact
              className="entity-details-page__dl"
              aria-label="Cluster version"
            >
              <DescriptionListGroup>
                <DescriptionListTerm>Current</DescriptionListTerm>
                <DescriptionListDescription>
                  <span className="entity-details-page__version-row">
                    <CatalogClusterVersionValue>
                      {getClusterPlatformLabel(instance)}
                    </CatalogClusterVersionValue>
                    <Label color={getClusterUpgradeStatusColor(upgradeStatus)} isCompact>
                      {getClusterUpgradeStatusLabel(upgradeStatus)}
                    </Label>
                  </span>
                </DescriptionListDescription>
              </DescriptionListGroup>
              {desiredVersion && upgradeStatus !== 'up-to-date' ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Desired</DescriptionListTerm>
                  <DescriptionListDescription>
                    <span className="entity-details-page__version-row">
                      <CatalogClusterVersionValue>{desiredVersion}</CatalogClusterVersionValue>
                      {upgradeStatus === 'upgrade-available' ? (
                        <Button
                          variant="link"
                          isInline
                          className="entity-details-page__upgrade-cluster-link"
                        >
                          Upgrade cluster
                        </Button>
                      ) : null}
                    </span>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}
            </DescriptionList>
          </div>

          <div className="entity-details-page__column-block">
            <div className="entity-details-page__section-header entity-details-page__section-header--config">
              <Title
                headingLevel="h2"
                size="md"
                className="entity-details-page__section-title entity-details-page__section-title--config"
              >
                Node sets
              </Title>
              <Button
                variant="link"
                isInline
                icon={<PlusCircleIcon />}
                className="entity-details-page__add-node-set"
              >
                Add node set
              </Button>
            </div>
            <ul className="entity-details-page__node-set-list" aria-label="Cluster node sets">
              {nodeSets.map((nodeSet) => {
                const status = nodeSet.status ?? 'ready'
                return (
                  <li key={nodeSet.id} className="entity-details-page__node-set-item">
                    <div className="entity-details-page__node-set-item-header">
                      <span className="entity-details-page__node-set-name">
                        {nodeSet.name ?? nodeSet.id}
                      </span>
                      <Label color={getNodeSetStatusColor(status)} isCompact>
                        {getNodeSetStatusLabel(status)}
                      </Label>
                    </div>
                    <Content component="p" className="entity-details-page__node-set-meta">
                      {nodeSet.hostType} · {nodeSet.nodeCount}{' '}
                      {nodeSet.nodeCount === 1 ? 'node' : 'nodes'} ·{' '}
                      {getClusterVersionShortLabel(nodeSet.version ?? '')}
                    </Content>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="entity-details-page__column-block">
            <Title
              headingLevel="h2"
              size="md"
              className="entity-details-page__section-title entity-details-page__section-title--config"
            >
              Settings
            </Title>
            <DescriptionList
              isCompact
              className="entity-details-page__dl"
              aria-label="Cluster settings"
            >
              <DescriptionListGroup>
                <DescriptionListTerm>Pod CIDR</DescriptionListTerm>
                <DescriptionListDescription>{clusterConfig.podCidr}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Service CIDR</DescriptionListTerm>
                <DescriptionListDescription>{clusterConfig.serviceCidr}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>SSH public key</DescriptionListTerm>
                <DescriptionListDescription>
                  <code className="tenant-user-instances__ssh-key">
                    {resolveBareMetalSshPublicKey(instance)}
                  </code>
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
          </div>
          </div>

          <div className="entity-details-page__column entity-details-page__column--config">
            <ClusterInventorySection
              nodes={inventoryNodes}
              isProvisioning={isProvisioning}
              embedded
            />
          </div>
        </div>
      </div>
    </>
  )
}

function VmInstancePageBody({
  instance,
  tenantSlug,
  projects,
  onAttachPublicIp,
  onUpdateNetworking,
  onNavigateToProject,
  onNavigateToCatalogItem,
  instanceNetworkingVariant,
}: {
  instance: TenantInstance
  tenantSlug: string
  projects: readonly TenantProject[]
  onAttachPublicIp?: (instance: TenantInstance) => void
  onUpdateNetworking?: (
    instanceId: string,
    networking: TenantInstanceNetworking,
    networkLabel: string,
  ) => void
  onNavigateToProject?: (project: TenantProject) => void
  onNavigateToCatalogItem?: (catalogItemDisplayName: string) => void
  instanceNetworkingVariant?: 'interactive' | 'summary'
}) {
  const isBusy = instance.status === 'provisioning' || instance.status === 'restarting'
  const vmConfig = resolveVmConfig(instance)
  const hasPublicIp = Boolean(vmConfig.publicIp)
  const canAttachPublicIp = !isBusy && !hasPublicIp
  const conditions = getVmInstanceConditions(instance)
  const vmHighlightRows = getTenantInstanceCardSpecRows(instance)
  const vmInstanceType =
    vmHighlightRows.find((row) => row.label === 'Instance type')?.value ??
    getVmInstanceTypeShortLabel(vmConfig.instanceType)
  const vmSize = vmHighlightRows.find((row) => row.label === 'Size')?.value ?? '—'
  const vmOsImage =
    vmHighlightRows.find((row) => row.label === 'OS image')?.value ??
    (instance.osImage.trim() || '—')

  return (
    <>
      <div className="entity-details-page__columns entity-details-page__columns--with-rail">
        <div className="entity-details-page__main-stack">
          <div className="entity-details-page__columns entity-details-page__columns--2">
            <div className="entity-details-page__column">
              <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                Overview
              </Title>
              <DescriptionList
                isCompact
                className="entity-details-page__dl"
                aria-label="Virtual machine overview"
              >
                <DescriptionListGroup>
                  <DescriptionListTerm>Status</DescriptionListTerm>
                  <DescriptionListDescription>
                    <InstanceStatusLabel status={instance.status} />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Catalog item</DescriptionListTerm>
                  <DescriptionListDescription>
                    <CatalogItemDisplayLink
                      displayName={instance.catalogItemDisplayName}
                      onNavigate={onNavigateToCatalogItem}
                    />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {instance.description?.trim() ? (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Description</DescriptionListTerm>
                    <DescriptionListDescription>
                      {instance.description.trim()}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                ) : null}
                <DescriptionListGroup>
                  <DescriptionListTerm>Instance type</DescriptionListTerm>
                  <DescriptionListDescription>{vmInstanceType}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Size</DescriptionListTerm>
                  <DescriptionListDescription>{vmSize}</DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>OS image</DescriptionListTerm>
                  <DescriptionListDescription>{vmOsImage}</DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>

            <div className="entity-details-page__column">
              <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                Lifecycle
              </Title>
              <DescriptionList
                isCompact
                className="entity-details-page__dl"
                aria-label="Virtual machine lifecycle"
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
          </div>

          <InstanceProjectsSection
            instance={instance}
            projects={projects}
            onNavigateToProject={onNavigateToProject}
          />

          <InstanceInheritedNetworkingSection
            instance={instance}
            tenantSlug={tenantSlug}
            onUpdateNetworking={onUpdateNetworking}
            conditions={conditions}
            conditionsAriaLabel="Virtual machine conditions"
            networkingVariant={instanceNetworkingVariant}
          />
        </div>

        <div className="entity-details-page__column entity-details-page__column--config">
          <Title
            headingLevel="h2"
            size="md"
            className="entity-details-page__section-title entity-details-page__section-title--config"
          >
            Specifications
          </Title>
          <DescriptionList
            isCompact
            className="entity-details-page__dl"
            aria-label="Virtual machine specifications"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>Public IP</DescriptionListTerm>
              <DescriptionListDescription>
                {hasPublicIp ? (
                  vmConfig.publicIp
                ) : canAttachPublicIp ? (
                  <Button
                    variant="link"
                    isInline
                    className="provider-admin-catalog-items__inline-link"
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
              <DescriptionListTerm>Boot Disk Size (GiB)</DescriptionListTerm>
              <DescriptionListDescription>{vmConfig.bootDiskSizeGiB} GB</DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </div>
      </div>
    </>
  )
}

function DefaultInstancePageBody({
  instance,
  tenantSlug,
  projects,
  onUpdateNetworking,
  onNavigateToProject,
  onNavigateToCatalogItem,
  instanceNetworkingVariant,
}: {
  instance: TenantInstance
  tenantSlug: string
  projects: readonly TenantProject[]
  onUpdateNetworking?: (
    instanceId: string,
    networking: TenantInstanceNetworking,
    networkLabel: string,
  ) => void
  onNavigateToProject?: (project: TenantProject) => void
  onNavigateToCatalogItem?: (catalogItemDisplayName: string) => void
  instanceNetworkingVariant?: 'interactive' | 'summary'
}) {
  const isBareMetal = getTenantInstanceServiceId(instance) === 'baremetal'
  const specRows = getTenantInstanceSpecRows(instance)
  const bareMetalConditions = isBareMetal ? getBareMetalInstanceConditions(instance) : []
  const bareMetalInventory = isBareMetal ? resolveBareMetalInventory(instance) : null

  return (
    <>
      <div className="entity-details-page__columns entity-details-page__columns--with-rail">
        <div className="entity-details-page__main-stack">
          <div className="entity-details-page__columns entity-details-page__columns--2">
            <div className="entity-details-page__column">
              <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                Overview
              </Title>
              <DescriptionList
                isCompact
                className="entity-details-page__dl"
                aria-label="Instance overview"
              >
                <DescriptionListGroup>
                  <DescriptionListTerm>Status</DescriptionListTerm>
                  <DescriptionListDescription>
                    <InstanceStatusLabel status={instance.status} />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Catalog item</DescriptionListTerm>
                  <DescriptionListDescription>
                    <CatalogItemDisplayLink
                      displayName={instance.catalogItemDisplayName}
                      onNavigate={onNavigateToCatalogItem}
                    />
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {instance.description?.trim() ? (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Description</DescriptionListTerm>
                    <DescriptionListDescription>
                      {instance.description.trim()}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                ) : null}
                {isBareMetal ? (
                  <>
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
                  </>
                ) : null}
              </DescriptionList>
            </div>

            {isBareMetal ? (
              <div className="entity-details-page__column">
                <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                  Access
                </Title>
                <DescriptionList
                  isCompact
                  className="entity-details-page__dl"
                  aria-label="Bare metal access"
                >
                  <DescriptionListGroup>
                    <DescriptionListTerm>Host</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{getBareMetalSshHost(instance)}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>SSH command</DescriptionListTerm>
                    <DescriptionListDescription>
                      <ClipboardCopy
                        isReadOnly
                        isCode
                        hoverTip="Copy SSH command"
                        clickTip="SSH command copied"
                        textAriaLabel="SSH connect command"
                      >
                        {getBareMetalSshCommand(instance)}
                      </ClipboardCopy>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Serial console</DescriptionListTerm>
                    <DescriptionListDescription>
                      {instance.status === 'running' ? (
                        <Button
                          variant="link"
                          isInline
                          onClick={() =>
                            window.open(
                              getBareMetalSerialConsoleUrl(instance),
                              '_blank',
                              'noopener,noreferrer',
                            )
                          }
                        >
                          Open serial console
                        </Button>
                      ) : (
                        'Available when the instance is running (BMC serial-over-LAN).'
                      )}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </div>
            ) : (
              <div className="entity-details-page__column">
                <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                  Lifecycle
                </Title>
                <DescriptionList
                  isCompact
                  className="entity-details-page__dl"
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
            )}
          </div>

          <InstanceProjectsSection
            instance={instance}
            projects={projects}
            onNavigateToProject={onNavigateToProject}
          />

          <InstanceInheritedNetworkingSection
            instance={instance}
            tenantSlug={tenantSlug}
            onUpdateNetworking={onUpdateNetworking}
            conditions={
              isBareMetal && bareMetalConditions.length > 0 ? bareMetalConditions : undefined
            }
            conditionsAriaLabel={
              isBareMetal && bareMetalConditions.length > 0 ? 'Bare metal conditions' : undefined
            }
            networkingVariant={instanceNetworkingVariant}
          />
        </div>

        <div className="entity-details-page__rail-stack">
          <div className="entity-details-page__column entity-details-page__column--config">
            <Title
              headingLevel="h2"
              size="md"
              className="entity-details-page__section-title entity-details-page__section-title--config"
            >
              Specifications
            </Title>
            <DescriptionList
              isCompact
              className="entity-details-page__dl"
              aria-label="Instance specifications"
            >
              {specRows.map((row) => (
                <DescriptionListGroup key={row.label}>
                  <DescriptionListTerm>{row.label}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {row.label === 'Disk image' ? (
                      <CatalogDiskImageValue>{row.value}</CatalogDiskImageValue>
                    ) : (
                      row.value
                    )}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ))}
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
          </div>

          {isBareMetal ? (
            <div className="entity-details-page__column entity-details-page__column--config">
              <BareMetalInventorySection inventory={bareMetalInventory} embedded />
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}

function InstanceProjectsSection({
  instance,
  projects,
  onNavigateToProject,
}: {
  instance: TenantInstance
  projects: readonly TenantProject[]
  onNavigateToProject?: (project: TenantProject) => void
}) {
  const owningProject = useMemo(() => {
    const [projectId] = getTenantInstanceProjectIds(instance)
    if (!projectId) {
      return null
    }
    return projects.find((project) => project.id === projectId) ?? null
  }, [instance, projects])

  const owningLabel = owningProject?.name ?? instance.projectName.trim()
  const hasOwningProject =
    Boolean(owningProject) ||
    (instance.scopeKind === 'project' && Boolean(owningLabel))

  return (
    <div className="entity-details-page__column entity-details-page__column--span-2 tenant-user-instance-details__projects">
      <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
        Project
      </Title>
      {!hasOwningProject ? (
        <Content component="p" className="tenant-admin-project-details__empty">
          Project is assigned when the instance is launched.
        </Content>
      ) : (
        <ul className="tenant-admin-project-details__list" aria-label="Owning project">
          <li className="tenant-admin-project-details__list-item">
            <div className="tenant-admin-project-details__member-row">
              <div className="tenant-admin-project-details__member-copy">
                <Content component="p" className="tenant-admin-project-details__primary">
                  {owningProject && onNavigateToProject ? (
                    <Button
                      variant="link"
                      isInline
                      className="tenant-admin-project-details__service-link"
                      onClick={() => onNavigateToProject(owningProject)}
                    >
                      {owningProject.name}
                    </Button>
                  ) : (
                    owningLabel
                  )}
                </Content>
                {owningProject ? (
                  <Content component="p" className="tenant-admin-project-details__meta">
                    {getTenantProjectEnvironmentLabel(owningProject.environmentType)} ·{' '}
                    {getTenantProjectMemberCountLabel(owningProject)}
                  </Content>
                ) : null}
              </div>
            </div>
          </li>
        </ul>
      )}
    </div>
  )
}

export function TenantUserInstanceDetailsPage({
  instance,
  tenantSlug,
  projects,
  onBack,
  onRequestTerminate,
  onRestart,
  onStart,
  onStop,
  onAttachPublicIp,
  onUpdateNetworking,
  onNavigateToProject,
  onNavigateToCatalogItem,
  onViewPassword,
  instanceNetworkingVariant = 'summary',
}: TenantUserInstanceDetailsPageProps) {
  const serviceId = getTenantInstanceServiceId(instance)
  const isCluster = serviceId === 'cluster'
  const isVm = serviceId === 'virtual-machine'
  const isBareMetal = serviceId === 'baremetal'

  const description = isCluster
    ? 'Review cluster endpoints, configuration, and node sets for this instance.'
    : isVm
      ? 'Review virtual machine configuration, networking, and conditions for this instance.'
      : isBareMetal
        ? 'Review configuration, networking, and how to access this bare metal host.'
        : 'Review configuration, networking, and lifecycle details for this instance.'

  const actions = isCluster ? (
    <ClusterLifecycleActions
      instance={instance}
      onRequestTerminate={onRequestTerminate}
      onViewPassword={onViewPassword}
    />
  ) : isVm ? (
    <VmLifecycleActions
      instance={instance}
      onRequestTerminate={onRequestTerminate}
      onRestart={onRestart}
      onStart={onStart}
      onStop={onStop}
    />
  ) : isBareMetal ? (
    <BareMetalLifecycleActions
      instance={instance}
      onRequestTerminate={onRequestTerminate}
      onRestart={onRestart}
      onStart={onStart}
      onStop={onStop}
    />
  ) : (
    <DefaultLifecycleActions
      instance={instance}
      onRequestTerminate={onRequestTerminate}
      onRestart={onRestart}
    />
  )

  return (
    <EntityDetailsPageShell
      parentLabel="Services"
      onBack={onBack}
      title={formatTenantInstanceName(instance.name)}
      titleId="tenant-user-instance-details-title"
      description={description}
      icon={getCatalogServiceIcon(serviceId)}
      actions={actions}
    >
      {isCluster ? (
        <ClusterInstancePageBody
          instance={instance}
          tenantSlug={tenantSlug}
          projects={projects}
          onUpdateNetworking={onUpdateNetworking}
          onNavigateToProject={onNavigateToProject}
          onNavigateToCatalogItem={onNavigateToCatalogItem}
          instanceNetworkingVariant={instanceNetworkingVariant}
        />
      ) : isVm ? (
        <VmInstancePageBody
          instance={instance}
          tenantSlug={tenantSlug}
          projects={projects}
          onAttachPublicIp={onAttachPublicIp}
          onUpdateNetworking={onUpdateNetworking}
          onNavigateToProject={onNavigateToProject}
          onNavigateToCatalogItem={onNavigateToCatalogItem}
          instanceNetworkingVariant={instanceNetworkingVariant}
        />
      ) : (
        <DefaultInstancePageBody
          instance={instance}
          tenantSlug={tenantSlug}
          projects={projects}
          onUpdateNetworking={onUpdateNetworking}
          onNavigateToProject={onNavigateToProject}
          onNavigateToCatalogItem={onNavigateToCatalogItem}
          instanceNetworkingVariant={instanceNetworkingVariant}
        />
      )}
    </EntityDetailsPageShell>
  )
}
