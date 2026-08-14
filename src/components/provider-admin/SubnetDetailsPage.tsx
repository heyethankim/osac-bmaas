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
import { EntityDetailsActionsDropdown } from "../shared/EntityDetailsActionsDropdown";
import {
  getNetworkInventoryStatus,
  getNetworkInventoryStatusLabelColor,
  type ProviderSubnet,
} from "../../providerAdmin/networkInventory";

type SubnetDetailsPageProps = {
  subnet: ProviderSubnet;
  virtualNetworkName: string;
  virtualNetworkCidr: string;
  onBack: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onNavigateToVirtualNetwork?: () => void;
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

export function SubnetDetailsPage({
  subnet,
  virtualNetworkName,
  virtualNetworkCidr,
  onBack,
  onEdit,
  onDelete,
  onNavigateToVirtualNetwork,
}: SubnetDetailsPageProps) {
  const status = getNetworkInventoryStatus(subnet);

  return (
    <EntityDetailsPageShell
      parentLabel="Subnets"
      onBack={onBack}
      title={subnet.name}
      titleId="subnet-details-title"
      description={
        subnet.detail.trim() ||
        "Subnet scoped to a virtual network for workload placement."
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
            aria-label="Subnet overview"
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
              <DescriptionListTerm>Subnet ID</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{subnet.id}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Created</DescriptionListTerm>
              <DescriptionListDescription>
                {formatCreatedAt(subnet.createdAt)}
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
            aria-label="Subnet configuration"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>CIDR</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{subnet.cidr}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>VLAN</DescriptionListTerm>
              <DescriptionListDescription>
                {subnet.vlan}
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
            Parent network
          </Title>
          <DescriptionList
            isCompact
            className="entity-details-page__dl"
            aria-label="Subnet parent network"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>Virtual network</DescriptionListTerm>
              <DescriptionListDescription>
                <Content
                  component="p"
                  className="provider-admin-network-inventory__primary-cell"
                >
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
                  <Content
                    component="p"
                    className="provider-admin-network-inventory__meta-cell"
                  >
                    <code>{virtualNetworkCidr}</code>
                  </Content>
                ) : null}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </div>
      </div>
    </EntityDetailsPageShell>
  );
}
