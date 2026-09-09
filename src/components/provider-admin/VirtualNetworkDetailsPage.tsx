import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Label,
  Title,
} from "@patternfly/react-core";
import { PlusCircleIcon } from "@patternfly/react-icons/dist/esm/icons/plus-circle-icon";
import { EntityDetailsPageShell } from "../shared/EntityDetailsPageShell";
import { EntityDetailsActionsDropdown } from "../shared/EntityDetailsActionsDropdown";
import { NatGatewaySectionActions } from "./NatGatewaySectionActions";
import { RelatedResourceItemActions } from "./RelatedResourceItemActions";
import {
  getNetworkInventoryStatus,
  getNetworkInventoryStatusLabelColor,
  getSecurityGroupsForVirtualNetwork,
  getSubnetsForVirtualNetwork,
  hasVirtualNetworkNatGateway,
  isNetworkInventoryResourceDeletable,
  NETWORK_INVENTORY_PROVISIONING_DELETE_TOOLTIP,
  type NetworkInventoryStatus,
  type ProviderSecurityGroup,
  type ProviderSubnet,
  type ProviderVirtualNetwork,
} from "../../providerAdmin/networkInventory";
import { resolveNetworkInventoryScope } from "../../shared/networkInventoryScope";

type RelatedItem = {
  id: string;
  name: string;
  meta: string;
  status: NetworkInventoryStatus;
};

type VirtualNetworkDetailsPageProps = {
  network: ProviderVirtualNetwork;
  tenantSlug?: string;
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAttachNatGateway?: () => void;
  onEditNatGateway?: () => void;
  onDetachNatGateway?: () => void;
  onNavigateToSubnet?: (subnetId: string) => void;
  onNavigateToSecurityGroup?: (securityGroupId: string) => void;
  onAddSubnet?: () => void;
  onAddSecurityGroup?: () => void;
  onEditSubnet?: (subnetId: string) => void;
  onDeleteSubnet?: (subnetId: string) => void;
  onEditSecurityGroup?: (securityGroupId: string) => void;
  onDeleteSecurityGroup?: (securityGroupId: string) => void;
};

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function RelatedResourceList({
  emptyLabel,
  items,
  onNavigate,
  onEditItem,
  onDeleteItem,
  ariaLabel,
}: {
  emptyLabel: string;
  items: RelatedItem[];
  onNavigate?: (id: string) => void;
  onEditItem?: (id: string) => void;
  onDeleteItem?: (id: string) => void;
  ariaLabel: string;
}) {
  return (
    <section
      className="provider-admin-network-inventory__drawer-related"
      aria-label={ariaLabel}
    >
      {items.length === 0 ? (
        <Content
          component="p"
          className="provider-admin-network-inventory__drawer-related-empty"
        >
          {emptyLabel}
        </Content>
      ) : (
        <ul className="entity-details-page__node-set-list provider-admin-virtual-network-details__related-list">
          {items.map((item) => {
            const canDelete = isNetworkInventoryResourceDeletable({ status: item.status })

            return (
              <li
                key={item.id}
                className="entity-details-page__node-set-item provider-admin-virtual-network-details__related-item"
              >
                <div className="entity-details-page__node-set-item-header provider-admin-virtual-network-details__related-item-header">
                  <div className="provider-admin-virtual-network-details__related-item-title">
                    {onNavigate ? (
                      <Button
                        variant="link"
                        isInline
                        className="catalog-table-name-link"
                        onClick={() => onNavigate(item.id)}
                      >
                        {item.name}
                      </Button>
                    ) : (
                      <span className="entity-details-page__node-set-name">{item.name}</span>
                    )}
                    <Label
                      color={getNetworkInventoryStatusLabelColor(item.status)}
                      isCompact
                    >
                      {item.status}
                    </Label>
                  </div>
                  {onEditItem || onDeleteItem ? (
                    <RelatedResourceItemActions
                      resourceName={item.name}
                      onEdit={onEditItem ? () => onEditItem(item.id) : undefined}
                      onDelete={onDeleteItem ? () => onDeleteItem(item.id) : undefined}
                      deleteDisabled={Boolean(onDeleteItem) && !canDelete}
                      deleteDisabledReason={NETWORK_INVENTORY_PROVISIONING_DELETE_TOOLTIP}
                    />
                  ) : null}
                </div>
                <Content component="p" className="entity-details-page__node-set-meta">
                  <code>{item.meta}</code>
                </Content>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  );
}

function toSubnetItems(subnets: readonly ProviderSubnet[]): RelatedItem[] {
  return subnets.map((subnet) => ({
    id: subnet.id,
    name: subnet.name,
    meta: `${subnet.cidr} · VLAN ${subnet.vlan}`,
    status: getNetworkInventoryStatus(subnet),
  }));
}

function toSecurityGroupItems(
  groups: readonly ProviderSecurityGroup[],
): RelatedItem[] {
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    meta: `In: ${group.inboundRules} · Out: ${group.outboundRules}`,
    status: getNetworkInventoryStatus(group),
  }));
}

export function VirtualNetworkDetailsPage({
  network,
  tenantSlug,
  onBack,
  onEdit,
  onDelete,
  onAttachNatGateway,
  onEditNatGateway,
  onDetachNatGateway,
  onNavigateToSubnet,
  onNavigateToSecurityGroup,
  onAddSubnet,
  onAddSecurityGroup,
  onEditSubnet,
  onDeleteSubnet,
  onEditSecurityGroup,
  onDeleteSecurityGroup,
}: VirtualNetworkDetailsPageProps) {
  const inventory = resolveNetworkInventoryScope(tenantSlug);
  const status = getNetworkInventoryStatus(network);
  const natGateway = hasVirtualNetworkNatGateway(network) ? network.natGateway : null;
  const relatedSubnets = toSubnetItems(
    getSubnetsForVirtualNetwork(inventory.getSubnets(), network.id),
  );
  const relatedSecurityGroups = toSecurityGroupItems(
    getSecurityGroupsForVirtualNetwork(inventory.getSecurityGroups(), network.id),
  );

  return (
    <EntityDetailsPageShell
      parentLabel="Virtual networks"
      onBack={onBack}
      title={network.name}
      titleId="virtual-network-details-title"
      description={
        network.detail.trim() ||
        "Virtual network available for workloads and catalog networking."
      }
      actions={
        onEdit || onDelete ? (
          <EntityDetailsActionsDropdown
            onEdit={onEdit}
            onRemove={onDelete}
            removeLabel="Delete"
          />
        ) : undefined
      }
    >
      <div className="entity-details-page__columns entity-details-page__columns--with-rail">
        <div className="entity-details-page__main-stack">
          <div className="entity-details-page__columns entity-details-page__columns--2">
            <div className="entity-details-page__column">
              <Title
                headingLevel="h2"
                size="lg"
                className="entity-details-page__section-title"
              >
                Overview
              </Title>
              <DescriptionList
                isCompact
                className="entity-details-page__dl"
                aria-label="Virtual network overview"
              >
                <DescriptionListGroup>
                  <DescriptionListTerm>Status</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label
                      color={getNetworkInventoryStatusLabelColor(status)}
                      isCompact
                    >
                      {status}
                    </Label>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Created</DescriptionListTerm>
                  <DescriptionListDescription>
                    {formatCreatedAt(network.createdAt)}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>

            <div className="entity-details-page__column">
              <Title
                headingLevel="h2"
                size="lg"
                className="entity-details-page__section-title"
              >
                Configuration
              </Title>
              <DescriptionList
                isCompact
                className="entity-details-page__dl"
                aria-label="Virtual network configuration"
              >
                <DescriptionListGroup>
                  <DescriptionListTerm>IPv4 CIDR</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{network.cidr}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>IPv6 CIDR</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{network.ipv6Cidr?.trim() ? network.ipv6Cidr : "—"}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            </div>
          </div>

          <div className="provider-admin-virtual-network-details__related-row">
            <Divider className="entity-details-page__band-divider" />
            <div className="provider-admin-virtual-network-details__related-section">
              <div className="entity-details-page__section-header entity-details-page__section-header--related-resources">
                <Title
                  headingLevel="h2"
                  size="xl"
                  className="entity-details-page__section-title entity-details-page__section-title--related-resources"
                >
                  Subnets
                </Title>
                {onAddSubnet ? (
                  <Button
                    variant="link"
                    isInline
                    icon={<PlusCircleIcon />}
                    className="entity-details-page__add-node-set"
                    onClick={onAddSubnet}
                  >
                    Add
                  </Button>
                ) : null}
              </div>
              <RelatedResourceList
                ariaLabel="Related subnets"
                emptyLabel="No subnets associated with this virtual network."
                items={relatedSubnets}
                onNavigate={onNavigateToSubnet}
                onEditItem={onEditSubnet}
                onDeleteItem={onDeleteSubnet}
              />
            </div>
          </div>

          <div className="provider-admin-virtual-network-details__related-row">
            <Divider className="entity-details-page__band-divider" />
            <div className="provider-admin-virtual-network-details__related-section">
              <div className="entity-details-page__section-header entity-details-page__section-header--related-resources">
                <Title
                  headingLevel="h2"
                  size="xl"
                  className="entity-details-page__section-title entity-details-page__section-title--related-resources"
                >
                  Security groups
                </Title>
                {onAddSecurityGroup ? (
                  <Button
                    variant="link"
                    isInline
                    icon={<PlusCircleIcon />}
                    className="entity-details-page__add-node-set"
                    onClick={onAddSecurityGroup}
                  >
                    Add
                  </Button>
                ) : null}
              </div>
              <RelatedResourceList
                ariaLabel="Related security groups"
                emptyLabel="No security groups associated with this virtual network."
                items={relatedSecurityGroups}
                onNavigate={onNavigateToSecurityGroup}
                onEditItem={onEditSecurityGroup}
                onDeleteItem={onDeleteSecurityGroup}
              />
            </div>
          </div>
        </div>

        <div className="entity-details-page__rail-stack">
          <div className="entity-details-page__column entity-details-page__column--config">
            <div className="entity-details-page__column-block">
              <div className="entity-details-page__section-header entity-details-page__section-header--config">
                <Title
                  headingLevel="h2"
                  size="md"
                  className="entity-details-page__section-title entity-details-page__section-title--config"
                >
                  NAT gateway
                </Title>
                {!natGateway && onAttachNatGateway ? (
                  <Button
                    variant="link"
                    isInline
                    icon={<PlusCircleIcon />}
                    className="entity-details-page__add-node-set"
                    onClick={onAttachNatGateway}
                  >
                    Attach
                  </Button>
                ) : null}
                {natGateway && (onEditNatGateway || onDetachNatGateway) ? (
                  <NatGatewaySectionActions
                    natGatewayName={natGateway.name}
                    onEdit={onEditNatGateway}
                    onDetach={onDetachNatGateway}
                  />
                ) : null}
              </div>
              {natGateway ? (
                <DescriptionList
                  isCompact
                  className="entity-details-page__dl"
                  aria-label="Attached NAT gateway"
                >
                  <DescriptionListGroup>
                    <DescriptionListTerm>Status</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Label
                        color={getNetworkInventoryStatusLabelColor(
                          getNetworkInventoryStatus(natGateway),
                        )}
                        isCompact
                      >
                        {getNetworkInventoryStatus(natGateway)}
                      </Label>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Name</DescriptionListTerm>
                    <DescriptionListDescription>{natGateway.name}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Public IP</DescriptionListTerm>
                    <DescriptionListDescription>
                      <code>{natGateway.publicIp}</code>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Attached</DescriptionListTerm>
                    <DescriptionListDescription>
                      {formatCreatedAt(natGateway.attachedAt)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              ) : (
                <Content
                  component="p"
                  className="provider-admin-network-inventory__drawer-related-empty"
                >
                  No NAT gateway attached to this virtual network.
                </Content>
              )}
            </div>
          </div>
        </div>
      </div>
    </EntityDetailsPageShell>
  );
}
