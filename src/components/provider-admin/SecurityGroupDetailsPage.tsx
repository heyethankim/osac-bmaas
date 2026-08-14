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
  type ProviderSecurityGroup,
} from "../../providerAdmin/networkInventory";

type SecurityGroupDetailsPageProps = {
  group: ProviderSecurityGroup;
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

export function SecurityGroupDetailsPage({
  group,
  virtualNetworkName,
  virtualNetworkCidr,
  onBack,
  onEdit,
  onDelete,
  onNavigateToVirtualNetwork,
}: SecurityGroupDetailsPageProps) {
  const status = getNetworkInventoryStatus(group);

  return (
    <EntityDetailsPageShell
      parentLabel="Security groups"
      onBack={onBack}
      title={group.name}
      titleId="security-group-details-title"
      description={
        group.detail.trim() ||
        "Security group available as a catalog networking default."
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
            aria-label="Security group overview"
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
              <DescriptionListTerm>Security group ID</DescriptionListTerm>
              <DescriptionListDescription>
                <code>{group.id}</code>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Created</DescriptionListTerm>
              <DescriptionListDescription>
                {formatCreatedAt(group.createdAt)}
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
            Rules
          </Title>
          <DescriptionList
            isCompact
            className="entity-details-page__dl"
            aria-label="Security group rules"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>Inbound rules</DescriptionListTerm>
              <DescriptionListDescription>
                {group.inboundRules}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Outbound rules</DescriptionListTerm>
              <DescriptionListDescription>
                {group.outboundRules}
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
            aria-label="Security group parent network"
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
