import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Label,
  Title,
} from "@patternfly/react-core";
import { EntityDetailsPageShell } from "../shared/EntityDetailsPageShell";
import { EntityDetailsActionsDropdown } from "../shared/EntityDetailsActionsDropdown";
import type { ExternalIpPool } from "../../providerAdmin/externalIpPools";
import type { RegisteredOrganization } from "../../providerAdmin/organizations";
import { resolveOrganizationExternalIpPools } from "../../tenantAdmin/projects";

type ExternalIpPoolDetailsPageProps = {
  pool: ExternalIpPool;
  organization: RegisteredOrganization | null;
  onBack: () => void;
  /** Provider-admin management actions; omitted for tenant read-only views. */
  onEdit?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
  /** Current tenant organization when viewing from tenant admin/user workspaces. */
  scopeOrganization?: RegisteredOrganization | null;
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
  onEdit,
  onDelete,
  readOnly = false,
  scopeOrganization = null,
}: ExternalIpPoolDetailsPageProps) {
  const isAssigned = pool.assignedOrganizationId !== null;
  const canManage = !readOnly;
  const canEdit = canManage && Boolean(onEdit);
  const canDelete = canManage && Boolean(onDelete);
  const isTenantView = readOnly && Boolean(scopeOrganization);
  const organizationPools = scopeOrganization
    ? resolveOrganizationExternalIpPools(scopeOrganization)
    : [];

  return (
    <EntityDetailsPageShell
      parentLabel="External IP pools"
      onBack={onBack}
      title={pool.name}
      titleId="external-ip-pool-details-title"
      description={
        isTenantView
          ? "Routable addresses available for workloads in your organization."
          : "Routable address pool for tenant edge exposure."
      }
      actions={
        canEdit || canDelete ? (
          <EntityDetailsActionsDropdown
            onEdit={canEdit ? onEdit : undefined}
            onRemove={canDelete ? onDelete : undefined}
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
            Capacity
          </Title>
          <DescriptionList
            isCompact
            className="entity-details-page__dl"
            aria-label="External IP pool capacity"
          >
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
          </DescriptionList>
        </div>

        <div className="entity-details-page__column">
          <Title
            headingLevel="h2"
            size="lg"
            className="entity-details-page__section-title"
          >
            {isTenantView ? "Organization" : "Assignment"}
          </Title>
          <DescriptionList
            isCompact
            className="entity-details-page__dl"
            aria-label={
              isTenantView ? "External IP pool organization scope" : "External IP pool assignment"
            }
          >
            {isTenantView ? (
              <>
                <DescriptionListGroup>
                  <DescriptionListTerm>Organization</DescriptionListTerm>
                  <DescriptionListDescription>
                    {scopeOrganization?.name ?? "—"}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Primary email domain</DescriptionListTerm>
                  <DescriptionListDescription>
                    <code>{scopeOrganization?.primaryDomain || "—"}</code>
                  </DescriptionListDescription>
                </DescriptionListGroup>
                {organizationPools.length > 0 ? (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Assigned platform pools</DescriptionListTerm>
                    <DescriptionListDescription>
                      <ul className="entity-details-page__pool-list">
                        {organizationPools.map((assignedPool) => (
                          <li key={assignedPool.id}>
                            {assignedPool.name}
                            {assignedPool.id === scopeOrganization?.externalIpPoolId ? (
                              <>
                                {" "}
                                <Label color="blue" isCompact>
                                  Primary
                                </Label>
                              </>
                            ) : null}
                            {" · "}
                            <code>{assignedPool.cidr}</code>
                          </li>
                        ))}
                      </ul>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                ) : null}
              </>
            ) : (
              <>
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
              </>
            )}
          </DescriptionList>
        </div>
      </div>
    </EntityDetailsPageShell>
  );
}
