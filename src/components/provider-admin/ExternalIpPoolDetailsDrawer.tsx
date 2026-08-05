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
  Title,
} from '@patternfly/react-core'
import type { ExternalIpPool } from '../../providerAdmin/externalIpPools'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'

type ExternalIpPoolDetailsDrawerProps = {
  isExpanded: boolean
  pool: ExternalIpPool | null
  organization: RegisteredOrganization | null
  onClose: () => void
  onAssign?: () => void
  onEdit?: () => void
  onDelete?: () => void
  children: ReactNode
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ExternalIpPoolDetailsDrawer({
  isExpanded,
  pool,
  organization,
  onClose,
  onAssign,
  onEdit,
  onDelete,
  children,
}: ExternalIpPoolDetailsDrawerProps) {
  const isAssigned = pool?.assignedOrganizationId !== null
  const canAssign = Boolean(onAssign) && !isAssigned
  const canEdit = Boolean(onEdit) && !isAssigned
  const canDelete = Boolean(onDelete) && !isAssigned

  const panelContent = pool ? (
    <DrawerPanelContent
      className="provider-admin-network-inventory__drawer-panel"
      defaultSize="28rem"
      minSize="22rem"
      focusTrap={{ enabled: true }}
    >
      <DrawerHead>
        <Title
          headingLevel="h2"
          size="xl"
          id="external-ip-pool-details-title"
          className="provider-admin-network-inventory__drawer-title"
        >
          {pool.name}
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClose={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody className="provider-admin-network-inventory__drawer-body">
        <Content component="p" className="provider-admin-network-inventory__drawer-lede">
          Routable address pool for tenant edge exposure.
        </Content>

        {canAssign || canEdit || canDelete ? (
          <div className="provider-admin-network-inventory__drawer-actions">
            {canAssign ? (
              <Button variant="primary" onClick={onAssign}>
                Assign to organization
              </Button>
            ) : null}
            {canEdit ? (
              <Button variant="secondary" onClick={onEdit}>
                Edit
              </Button>
            ) : null}
            {canDelete ? (
              <Button variant="secondary" isDanger onClick={onDelete}>
                Delete
              </Button>
            ) : null}
          </div>
        ) : null}

        <Divider className="provider-admin-network-inventory__drawer-divider" />

        <DescriptionList
          isCompact
          className="provider-admin-network-inventory__drawer-dl"
          aria-label="External IP pool details"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>Status</DescriptionListTerm>
            <DescriptionListDescription>
              {isAssigned ? (
                <Label color="blue" isCompact>
                  Assigned
                </Label>
              ) : (
                <Label color="green" isCompact>
                  Available
                </Label>
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Pool ID</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{pool.id}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>CIDR</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{pool.cidr}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Data center</DescriptionListTerm>
            <DescriptionListDescription>{pool.dataCenter}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Capacity</DescriptionListTerm>
            <DescriptionListDescription>
              {pool.totalAddresses.toLocaleString()} addresses
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Assignment</DescriptionListTerm>
            <DescriptionListDescription>
              {pool.assignedOrganizationName ?? (
                <Label color="green" isCompact>
                  Available
                </Label>
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          {organization ? (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>Primary email domain</DescriptionListTerm>
                <DescriptionListDescription>
                  <code>{organization.primaryDomain || '—'}</code>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Organization status</DescriptionListTerm>
                <DescriptionListDescription>
                  <Label
                    color={organization.status === 'Active' ? 'green' : 'orange'}
                    isCompact
                  >
                    {organization.status}
                  </Label>
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Login path</DescriptionListTerm>
                <DescriptionListDescription>
                  <code>/tenant-admin/{organization.slug}</code>
                </DescriptionListDescription>
              </DescriptionListGroup>
            </>
          ) : null}
          <DescriptionListGroup>
            <DescriptionListTerm>Created</DescriptionListTerm>
            <DescriptionListDescription>{formatCreatedAt(pool.createdAt)}</DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </DrawerPanelBody>
    </DrawerPanelContent>
  ) : null

  return (
    <Drawer
      isExpanded={isExpanded && pool !== null}
      position="end"
      onExpand={() => undefined}
      className="provider-admin-network-inventory__drawer"
    >
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>{children}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  )
}
