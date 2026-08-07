import {
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Title,
} from "@patternfly/react-core";
import { EntityDetailsPageShell } from "../shared/EntityDetailsPageShell";
import type { ExternalIpPool } from "../../providerAdmin/externalIpPools";
import type { RegisteredOrganization } from "../../providerAdmin/organizations";

type ExternalIpPoolDetailsPageProps = {
  pool: ExternalIpPool;
  organization: RegisteredOrganization | null;
  onBack: () => void;
  onAssign?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
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

export function ExternalIpPoolDetailsPage({
  pool,
  organization,
  onBack,
  onAssign,
  onEdit,
  onDelete,
}: ExternalIpPoolDetailsPageProps) {
  const isAssigned = pool.assignedOrganizationId !== null;
  const canAssign = Boolean(onAssign) && !isAssigned;
  const canEdit = Boolean(onEdit) && !isAssigned;
  const canDelete = Boolean(onDelete) && !isAssigned;

  return (
    <EntityDetailsPageShell
      parentLabel="External IP pools"
      onBack={onBack}
      title={pool.name}
      titleId="external-ip-pool-details-title"
      description="Routable address pool for tenant edge exposure."
      actions={
        canAssign || canEdit || canDelete ? (
          <>
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
            aria-label="External IP pool overview"
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
              <DescriptionListDescription>
                {pool.dataCenter}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Capacity</DescriptionListTerm>
              <DescriptionListDescription>
                {pool.totalAddresses.toLocaleString()} addresses
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Created</DescriptionListTerm>
              <DescriptionListDescription>
                {formatCreatedAt(pool.createdAt)}
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
            Assignment
          </Title>
          <DescriptionList
            isCompact
            className="entity-details-page__dl"
            aria-label="External IP pool assignment"
          >
            <DescriptionListGroup>
              <DescriptionListTerm>Organization</DescriptionListTerm>
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
                  <DescriptionListTerm>
                    Primary email domain
                  </DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{organization.primaryDomain || "—"}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Organization status</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Label
                      color={
                        organization.status === "Active" ? "green" : "orange"
                      }
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
          </DescriptionList>
        </div>
      </div>
    </EntityDetailsPageShell>
  );
}
