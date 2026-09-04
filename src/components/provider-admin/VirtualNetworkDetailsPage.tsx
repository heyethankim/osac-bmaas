import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Title,
} from "@patternfly/react-core";
import { PlusCircleIcon } from "@patternfly/react-icons/dist/esm/icons/plus-circle-icon";
import { EntityDetailsPageShell } from "../shared/EntityDetailsPageShell";
import { EntityDetailsActionsDropdown } from "../shared/EntityDetailsActionsDropdown";
import {
  getNetworkInventoryStatus,
  getNetworkInventoryStatusLabelColor,
  getSecurityGroupsForVirtualNetwork,
  getSubnetsForVirtualNetwork,
  hasVirtualNetworkNatGateway,
  type ProviderSecurityGroup,
  type ProviderSubnet,
  type ProviderVirtualNetwork,
} from "../../providerAdmin/networkInventory";
import { resolveNetworkInventoryScope } from "../../shared/networkInventoryScope";

type RelatedItem = {
  id: string;
  name: string;
  meta: string;
};

type VirtualNetworkDetailsPageProps = {
  network: ProviderVirtualNetwork;
  tenantSlug?: string;
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAttachNatGateway?: () => void;
  onNavigateToSubnet?: (subnetId: string) => void;
  onNavigateToSecurityGroup?: (securityGroupId: string) => void;
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
  ariaLabel,
}: {
  emptyLabel: string;
  items: RelatedItem[];
  onNavigate?: (id: string) => void;
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
        <ul className="provider-admin-network-inventory__drawer-related-list">
          {items.map((item) => (
            <li
              key={item.id}
              className="provider-admin-network-inventory__drawer-related-item"
            >
              <div className="provider-admin-network-inventory__drawer-related-name">
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
              </div>
              <div className="provider-admin-network-inventory__drawer-related-meta">
                <code>{item.meta}</code>
              </div>
            </li>
          ))}
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
  }));
}

function toSecurityGroupItems(
  groups: readonly ProviderSecurityGroup[],
): RelatedItem[] {
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    meta: `In: ${group.inboundRules} · Out: ${group.outboundRules}`,
  }));
}

export function VirtualNetworkDetailsPage({
  network,
  tenantSlug,
  onBack,
  onEdit,
  onDelete,
  onAttachNatGateway,
  onNavigateToSubnet,
  onNavigateToSecurityGroup,
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

              <Title
                headingLevel="h2"
                size="lg"
                className="entity-details-page__section-title"
              >
                Subnets
              </Title>
              <RelatedResourceList
                ariaLabel="Related subnets"
                emptyLabel="No subnets associated with this virtual network."
                items={relatedSubnets}
                onNavigate={onNavigateToSubnet}
              />

              <Title
                headingLevel="h2"
                size="lg"
                className="entity-details-page__section-title"
              >
                Security groups
              </Title>
              <RelatedResourceList
                ariaLabel="Related security groups"
                emptyLabel="No security groups associated with this virtual network."
                items={relatedSecurityGroups}
                onNavigate={onNavigateToSecurityGroup}
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
              </div>
              {natGateway ? (
                <DescriptionList
                  isCompact
                  className="entity-details-page__dl"
                  aria-label="Attached NAT gateway"
                >
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
