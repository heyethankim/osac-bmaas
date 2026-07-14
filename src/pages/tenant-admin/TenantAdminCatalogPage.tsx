import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  Content,
  Label,
  Switch,
  Title,
} from '@patternfly/react-core'
import { AngleRightIcon } from '@patternfly/react-icons/dist/esm/icons/angle-right-icon'
import { CubesIcon } from '@patternfly/react-icons/dist/esm/icons/cubes-icon'
import { TimesIcon } from '@patternfly/react-icons/dist/esm/icons/times-icon'
import {
  getTenantCatalogAuthorizedTeams,
  TENANT_CATALOG_GOVERNANCE_ITEMS,
  TENANT_CATALOG_MANAGER_DEMO,
} from '../../tenantAdmin/catalogManager'
import type { TenantProject } from '../../tenantAdmin/projects'

type TenantAdminCatalogPageProps = {
  projects: TenantProject[]
  onNavigateToProjectsTeams: () => void
}

export function TenantAdminCatalogPage({
  projects,
  onNavigateToProjectsTeams,
}: TenantAdminCatalogPageProps) {
  const [approvedByItemId, setApprovedByItemId] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      TENANT_CATALOG_GOVERNANCE_ITEMS.map((item) => [item.id, item.approved]),
    ),
  )
  const [removedTeamsByItemId, setRemovedTeamsByItemId] = useState<Record<string, string[]>>({})

  const authorizedTeamsByItemId = useMemo(() => {
    const projectTeamNames = getTenantCatalogAuthorizedTeams(projects)

    return Object.fromEntries(
      TENANT_CATALOG_GOVERNANCE_ITEMS.map((item) => {
        const removed = new Set(removedTeamsByItemId[item.id] ?? [])

        return [item.id, projectTeamNames.filter((teamName) => !removed.has(teamName))]
      }),
    )
  }, [projects, removedTeamsByItemId])

  const handleRemoveAuthorizedTeam = (itemId: string, teamName: string) => {
    setRemovedTeamsByItemId((current) => ({
      ...current,
      [itemId]: [...(current[itemId] ?? []), teamName],
    }))
  }

  return (
    <div className="tenant-admin-workspace-page tenant-admin-catalog-manager">
      <Title headingLevel="h1" size="3xl" className="tenant-admin-catalog-manager__title">
        {TENANT_CATALOG_MANAGER_DEMO.title}
      </Title>
      <Content component="p" className="tenant-admin-catalog-manager__lede">
        {TENANT_CATALOG_MANAGER_DEMO.lede}
      </Content>

      <div className="tenant-admin-catalog-manager__catalog-list">
        {TENANT_CATALOG_GOVERNANCE_ITEMS.map((item) => {
          const isApproved = approvedByItemId[item.id] ?? item.approved
          const authorizedTeams = authorizedTeamsByItemId[item.id] ?? []

          return (
            <Card
              key={item.id}
              isCompact={false}
              className="tenant-admin-catalog-manager__card"
            >
              <CardBody>
                <div className="tenant-admin-catalog-manager__card-top">
                  <div className="tenant-admin-catalog-manager__header">
                    <span className="tenant-admin-catalog-manager__icon" aria-hidden>
                      <CubesIcon />
                    </span>
                    <div className="tenant-admin-catalog-manager__header-copy">
                      <div className="tenant-admin-catalog-manager__meta-row">
                        <Label color="blue" isCompact>
                          {item.service}
                        </Label>
                        <Label color="green" isCompact>
                          {item.status}
                        </Label>
                      </div>
                      <Content
                        component="p"
                        className="tenant-admin-catalog-manager__display-name"
                      >
                        {item.displayName}
                      </Content>
                      <Content
                        component="p"
                        className="tenant-admin-catalog-manager__category-label"
                      >
                        {item.categoryLabel}
                      </Content>
                    </div>
                  </div>

                  <div className="tenant-admin-catalog-manager__approval-control">
                    <Switch
                      id={`catalog-item-approved-${item.id}`}
                      aria-label={`Approve ${item.displayName}`}
                      isChecked={isApproved}
                      onChange={(_event, checked) => {
                        setApprovedByItemId((current) => ({
                          ...current,
                          [item.id]: checked,
                        }))
                      }}
                    />
                    <Content
                      component="p"
                      className={
                        isApproved
                          ? 'tenant-admin-catalog-manager__approval-label tenant-admin-catalog-manager__approval-label--approved'
                          : 'tenant-admin-catalog-manager__approval-label'
                      }
                    >
                      {TENANT_CATALOG_MANAGER_DEMO.approvedLabel}
                    </Content>
                  </div>
                </div>

                <dl className="tenant-admin-catalog-manager__specs-list">
                  <div className="tenant-admin-catalog-manager__spec-row">
                    <dt className="tenant-admin-catalog-manager__spec-label">CPU</dt>
                    <dd className="tenant-admin-catalog-manager__spec-value">{item.cpu}</dd>
                  </div>
                  <div className="tenant-admin-catalog-manager__spec-row">
                    <dt className="tenant-admin-catalog-manager__spec-label">RAM</dt>
                    <dd className="tenant-admin-catalog-manager__spec-value">{item.ram}</dd>
                  </div>
                  <div className="tenant-admin-catalog-manager__spec-row">
                    <dt className="tenant-admin-catalog-manager__spec-label">GPU</dt>
                    <dd className="tenant-admin-catalog-manager__spec-value">{item.gpu}</dd>
                  </div>
                  <div className="tenant-admin-catalog-manager__spec-row">
                    <dt className="tenant-admin-catalog-manager__spec-label">OS image</dt>
                    <dd className="tenant-admin-catalog-manager__spec-value">{item.osImage}</dd>
                  </div>
                </dl>

                <div className="tenant-admin-catalog-manager__authorized-teams">
                  <Content
                    component="p"
                    className="tenant-admin-catalog-manager__authorized-teams-label"
                  >
                    {TENANT_CATALOG_MANAGER_DEMO.authorizedTeamsLabel}
                  </Content>

                  {authorizedTeams.length > 0 ? (
                    <div className="tenant-admin-catalog-manager__team-list">
                      {authorizedTeams.map((teamName) => (
                        <Label
                          key={teamName}
                          color="teal"
                          isCompact
                          className="tenant-admin-catalog-manager__team-pill"
                        >
                          <span className="tenant-admin-catalog-manager__team-pill-content">
                            <span>{teamName}</span>
                            <Button
                              variant="plain"
                              icon={<TimesIcon />}
                              aria-label={`Remove ${teamName}`}
                              className="tenant-admin-catalog-manager__team-remove"
                              onClick={() => handleRemoveAuthorizedTeam(item.id, teamName)}
                            />
                          </span>
                        </Label>
                      ))}
                    </div>
                  ) : null}

                  <div className="tenant-admin-catalog-manager__authorized-teams-status">
                    <span>
                      {authorizedTeams.length === 0 ? (
                        <>
                          {TENANT_CATALOG_MANAGER_DEMO.authorizedTeamsEmpty}
                          {' · '}
                        </>
                      ) : null}
                      <button
                        type="button"
                        className="tenant-admin-catalog-manager__add-team-link"
                        onClick={onNavigateToProjectsTeams}
                      >
                        {TENANT_CATALOG_MANAGER_DEMO.addProjectTeamsLinkLabel}
                        <AngleRightIcon aria-hidden />
                      </button>
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
