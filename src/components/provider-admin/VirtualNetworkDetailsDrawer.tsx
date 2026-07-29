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
import {
  getNetworkInventoryStatus,
  getNetworkInventoryStatusLabelColor,
  getSecurityGroupsForVirtualNetwork,
  getSubnetsForVirtualNetwork,
  type ProviderSecurityGroup,
  type ProviderSubnet,
  type ProviderVirtualNetwork,
} from '../../providerAdmin/networkInventory'
import {
  getProviderSecurityGroups,
  getProviderSubnets,
} from '../../providerSetup/storage'

type RelatedItem = {
  id: string
  name: string
  meta: string
}

type VirtualNetworkDetailsDrawerProps = {
  isExpanded: boolean
  network: ProviderVirtualNetwork | null
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
  onNavigateToSubnet?: (subnetId: string) => void
  onNavigateToSecurityGroup?: (securityGroupId: string) => void
  children: ReactNode
}

function RelatedResourceList({
  title,
  emptyLabel,
  items,
  onNavigate,
}: {
  title: string
  emptyLabel: string
  items: RelatedItem[]
  onNavigate?: (id: string) => void
}) {
  return (
    <section className="provider-admin-network-inventory__drawer-related" aria-label={title}>
      <Content component="p" className="provider-admin-network-inventory__drawer-related-title">
        {title}
      </Content>
      {items.length === 0 ? (
        <Content component="p" className="provider-admin-network-inventory__drawer-related-empty">
          {emptyLabel}
        </Content>
      ) : (
        <ul className="provider-admin-network-inventory__drawer-related-list">
          {items.map((item) => (
            <li key={item.id} className="provider-admin-network-inventory__drawer-related-item">
              <Content
                component="p"
                className="provider-admin-network-inventory__drawer-related-name"
              >
                {onNavigate ? (
                  <Button
                    variant="link"
                    isInline
                    className="provider-admin-network-inventory__related-link"
                    onClick={() => onNavigate(item.id)}
                  >
                    {item.name}
                  </Button>
                ) : (
                  item.name
                )}
              </Content>
              <Content
                component="p"
                className="provider-admin-network-inventory__drawer-related-meta"
              >
                <code>{item.meta}</code>
              </Content>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function toSubnetItems(subnets: readonly ProviderSubnet[]): RelatedItem[] {
  return subnets.map((subnet) => ({
    id: subnet.id,
    name: subnet.name,
    meta: `${subnet.cidr} · VLAN ${subnet.vlan}`,
  }))
}

function toSecurityGroupItems(groups: readonly ProviderSecurityGroup[]): RelatedItem[] {
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    meta: `In: ${group.inboundRules} · Out: ${group.outboundRules}`,
  }))
}

export function VirtualNetworkDetailsDrawer({
  isExpanded,
  network,
  onClose,
  onEdit,
  onDelete,
  onNavigateToSubnet,
  onNavigateToSecurityGroup,
  children,
}: VirtualNetworkDetailsDrawerProps) {
  const relatedSubnets = network
    ? toSubnetItems(getSubnetsForVirtualNetwork(getProviderSubnets(), network.id))
    : []
  const relatedSecurityGroups = network
    ? toSecurityGroupItems(
        getSecurityGroupsForVirtualNetwork(getProviderSecurityGroups(), network.id),
      )
    : []

  const panelContent = network ? (
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
          id="virtual-network-details-title"
          className="provider-admin-network-inventory__drawer-title"
        >
          {network.name}
        </Title>
        <DrawerActions>
          <DrawerCloseButton onClose={onClose} />
        </DrawerActions>
      </DrawerHead>

      <DrawerPanelBody className="provider-admin-network-inventory__drawer-body">
        <Content component="p" className="provider-admin-network-inventory__drawer-lede">
          {network.detail.trim() || 'Virtual network available for workloads and catalog networking.'}
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
          aria-label="Virtual network details"
        >
          <DescriptionListGroup>
            <DescriptionListTerm>Status</DescriptionListTerm>
            <DescriptionListDescription>
              {network ? (
                <Label
                  color={getNetworkInventoryStatusLabelColor(getNetworkInventoryStatus(network))}
                  isCompact
                >
                  {getNetworkInventoryStatus(network)}
                </Label>
              ) : (
                '—'
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Network ID</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{network.id}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>IPv4 CIDR</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{network.cidr}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>IPv6 CIDR</DescriptionListTerm>
            <DescriptionListDescription>
              <code>{network.ipv6Cidr?.trim() ? network.ipv6Cidr : '—'}</code>
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        <Divider className="provider-admin-network-inventory__drawer-divider" />

        <RelatedResourceList
          title="Subnets"
          emptyLabel="No subnets associated with this virtual network."
          items={relatedSubnets}
          onNavigate={onNavigateToSubnet}
        />

        <RelatedResourceList
          title="Security groups"
          emptyLabel="No security groups associated with this virtual network."
          items={relatedSecurityGroups}
          onNavigate={onNavigateToSecurityGroup}
        />
      </DrawerPanelBody>
    </DrawerPanelContent>
  ) : null

  return (
    <Drawer
      isExpanded={isExpanded && network !== null}
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
