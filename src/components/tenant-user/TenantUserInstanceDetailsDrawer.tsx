import type { ReactNode } from 'react'
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
import { ServerIcon } from '@patternfly/react-icons/dist/esm/icons/server-icon'
import {
  formatTenantInstanceCreatedAt,
  formatTenantInstanceName,
  getTenantInstanceScopeFieldLabel,
  getTenantInstanceStatusLabel,
  resolveTenantInstanceNetworking,
  type TenantInstance,
} from '../../tenantUser/instances'

type TenantUserInstanceDetailsDrawerProps = {
  isExpanded: boolean
  onClose: () => void
  instance: TenantInstance | null
  onRequestTerminate: (instance: TenantInstance) => void
  onRestart: (instanceId: string) => void
  children: ReactNode
}

function getStatusColor(status: TenantInstance['status']): 'green' | 'blue' | 'red' {
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

export function TenantUserInstanceDetailsDrawer({
  isExpanded,
  onClose,
  instance,
  onRequestTerminate,
  onRestart,
  children,
}: TenantUserInstanceDetailsDrawerProps) {
  const isRunning = instance?.status === 'running'
  const isRestarting = instance?.status === 'restarting'
  const canRestart = isRunning
  const canTerminate =
    instance !== null && instance.status !== 'provisioning' && instance.status !== 'restarting'
  const networking = instance ? resolveTenantInstanceNetworking(instance) : null

  const panelContent = instance && networking ? (
    <DrawerPanelContent
      className="tenant-user-instances__drawer-panel"
      defaultSize="28rem"
      minSize="22rem"
      focusTrap={{ enabled: true }}
    >
      <DrawerHead>
        <div className="tenant-user-instances__drawer-title-row">
          <span className="tenant-user-instances__drawer-icon-wrap" aria-hidden>
            <ServerIcon />
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
        <Content component="p" className="tenant-user-instances__drawer-lede">
          Review configuration, networking, and lifecycle details for this instance.
        </Content>

        <div className="tenant-user-instances__drawer-actions">
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
            <Button
              variant="secondary"
              isDanger
              onClick={() => onRequestTerminate(instance)}
            >
              Terminate
            </Button>
          ) : (
            <Tooltip
              content={
                isRestarting
                  ? 'Terminate is unavailable while restarting'
                  : 'Terminate is unavailable while provisioning'
              }
            >
              <Button variant="secondary" isDanger isAriaDisabled>
                Terminate
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
              <code className="tenant-user-instances__drawer-mono">{instance.id}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        <Divider className="tenant-user-instances__drawer-divider" />

        <DescriptionList
          isCompact
          className="tenant-user-instances__drawer-dl"
          aria-label="Instance specifications"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>Hardware</DescriptionListTerm>
            <DescriptionListDescription>{instance.hardwareProfile}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>OS image</DescriptionListTerm>
            <DescriptionListDescription>{instance.osImage}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>GPU</DescriptionListTerm>
            <DescriptionListDescription>{instance.gpuLabel}</DescriptionListDescription>
          </DescriptionListGroup>
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
