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
import type { ProviderSubnet } from '../../providerAdmin/networkInventory'

type SubnetDetailsDrawerProps = {
  isExpanded: boolean
  subnet: ProviderSubnet | null
  virtualNetworkName: string
  virtualNetworkCidr: string
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
  onNavigateToVirtualNetwork?: () => void
  children: ReactNode
}

export function SubnetDetailsDrawer({
  isExpanded,
  subnet,
  virtualNetworkName,
  virtualNetworkCidr,
  onClose,
  onEdit,
  onDelete,
  onNavigateToVirtualNetwork,
  children,
}: SubnetDetailsDrawerProps) {
  const panelContent = subnet ? (
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
          id="subnet-details-title"
          className="provider-admin-network-inventory__drawer-title"
        >
          {subnet.name}
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClose={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody className="provider-admin-network-inventory__drawer-body">
        <Content component="p" className="provider-admin-network-inventory__drawer-lede">
          {subnet.detail.trim() || 'Subnet scoped to a virtual network for workload placement.'}
        </Content>

        {onEdit || onDelete ? (
          <div className="provider-admin-network-inventory__drawer-actions">
            {onEdit ? (
              <Button variant="secondary" onClick={onEdit}>
                Edit
              </Button>
            ) : null}
            {onDelete ? (
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
          aria-label="Subnet details"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>Status</DescriptionListTerm>
            <DescriptionListDescription>
              <Label color="green" isCompact>
                Ready
              </Label>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Subnet ID</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{subnet.id}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>CIDR</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{subnet.cidr}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>VLAN</DescriptionListTerm>
            <DescriptionListDescription>{subnet.vlan}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Virtual network</DescriptionListTerm>
            <DescriptionListDescription>
              <Content component="p" className="provider-admin-network-inventory__primary-cell">
                {onNavigateToVirtualNetwork ? (
                  <Button
                    variant="link"
                    isInline
                    className="provider-admin-network-inventory__related-link"
                    onClick={onNavigateToVirtualNetwork}
                  >
                    {virtualNetworkName}
                  </Button>
                ) : (
                  virtualNetworkName
                )}
              </Content>
              {virtualNetworkCidr ? (
                <Content component="p" className="provider-admin-network-inventory__meta-cell">
                  <code>{virtualNetworkCidr}</code>
                </Content>
              ) : null}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </DrawerPanelBody>
    </DrawerPanelContent>
  ) : null

  return (
    <Drawer
      isExpanded={isExpanded && subnet !== null}
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
