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
import { EntityDetailsPageShell } from "../shared/EntityDetailsPageShell";
import {
  getNetworkInventoryStatus,
  getNetworkInventoryStatusLabelColor,
  getSecurityGroupsForVirtualNetwork,
  getSubnetsForVirtualNetwork,
  type ProviderSecurityGroup,
  type ProviderSubnet,
  type ProviderVirtualNetwork,
} from "../../providerAdmin/networkInventory";
import {
  getProviderSecurityGroups,
  getProviderSubnets,
} from "../../providerSetup/storage";

type RelatedItem = {
  id: string;
  name: string;
  meta: string;
};

type VirtualNetworkDetailsPageProps = {
  network: ProviderVirtualNetwork;
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onNavigateToSubnet?: (subnetId: string) => void;
  onNavigateToSecurityGroup?: (securityGroupId: string) => void;
};

function RelatedResourceList({
  title,
  emptyLabel,
  items,
  onNavigate,
}: {
  title: string;
  emptyLabel: string;
  items: RelatedItem[];
  onNavigate?: (id: string) => void;
}) {
  return (
    <section
      className="provider-admin-network-inventory__drawer-related"
      aria-label={title}
    >
      <Content
        component="p"
        className="provider-admin-network-inventory__drawer-related-title"
      >
        {title}
      </Content>
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
  onBack,
  onEdit,
  onDelete,
  onNavigateToSubnet,
  onNavigateToSecurityGroup,
}: VirtualNetworkDetailsPageProps) {
  const status = getNetworkInventoryStatus(network);
  const relatedSubnets = toSubnetItems(
    getSubnetsForVirtualNetwork(getProviderSubnets(), network.id),
  );
  const relatedSecurityGroups = toSecurityGroupItems(
    getSecurityGroupsForVirtualNetwork(getProviderSecurityGroups(), network.id),
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
          <>
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
          </>
        ) : undefined
      }
    >
      <div className="entity-details-page__columns">
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
                <code>{network.ipv6Cidr?.trim() ? network.ipv6Cidr : "—"}</code>
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
            Related resources
          </Title>
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
        </div>
      </div>
    </EntityDetailsPageShell>
  );
}
