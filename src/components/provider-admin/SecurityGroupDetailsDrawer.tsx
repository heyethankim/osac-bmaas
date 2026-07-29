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
import type { ProviderSecurityGroup } from '../../providerAdmin/networkInventory'

type SecurityGroupDetailsDrawerProps = {
  isExpanded: boolean
  group: ProviderSecurityGroup | null
  virtualNetworkName: string
  virtualNetworkCidr: string
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
  onNavigateToVirtualNetwork?: () => void
  children: ReactNode
}

export function SecurityGroupDetailsDrawer({
  isExpanded,
  group,
  virtualNetworkName,
  virtualNetworkCidr,
  onClose,
  onEdit,
  onDelete,
  onNavigateToVirtualNetwork,
  children,
}: SecurityGroupDetailsDrawerProps) {
  const panelContent = group ? (
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
          id="security-group-details-title"
          className="provider-admin-network-inventory__drawer-title"
        >
          {group.name}
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClose={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody className="provider-admin-network-inventory__drawer-body">
        <Content component="p" className="provider-admin-network-inventory__drawer-lede">
          {group.detail.trim() || 'Security group available as a catalog networking default.'}
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
          aria-label="Security group details"
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
            <DescriptionListTerm>Security group ID</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{group.id}</code>
            </DescriptionListDescription>
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
          <DescriptionListGroup>
            <DescriptionListTerm>Inbound rules</DescriptionListTerm>
            <DescriptionListDescription>{group.inboundRules}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Outbound rules</DescriptionListTerm>
            <DescriptionListDescription>{group.outboundRules}</DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </DrawerPanelBody>
    </DrawerPanelContent>
  ) : null

  return (
    <Drawer
      isExpanded={isExpanded && group !== null}
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
