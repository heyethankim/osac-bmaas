import { useMemo, useState } from 'react'
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
} from '@patternfly/react-core'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import { ActionsColumn, Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import { EntityDetailsPageShell } from '../shared/EntityDetailsPageShell'
import { EntityDetailsActionsDropdown } from '../shared/EntityDetailsActionsDropdown'
import { BindServiceAccountRoleModal } from './BindServiceAccountRoleModal'
import { ServiceAccountTokenRevealModal } from './ServiceAccountTokenRevealModal'
import { getAssignableTenantRole, type AssignableTenantRoleId } from '../../tenantAdmin/administrators'
import {
  bindServiceAccountRole,
  createServiceAccountToken,
  deleteServiceAccountToken,
  formatServiceAccountCreatedAtLong,
  getServiceAccountTokenValue,
  listServiceAccountTokenSecrets,
  TENANT_SERVICE_ACCOUNTS_DEMO,
  unbindServiceAccountRole,
  type TenantServiceAccount,
} from '../../tenantAdmin/serviceAccounts'
import type { TenantSecret } from '../../tenant/secrets'
import { renderInventoryCardIcon, SERVICE_ACCOUNT_CARD_ICON } from '../catalog/inventoryCardIcons'

type ServiceAccountDetailsPageProps = {
  tenantSlug: string
  account: TenantServiceAccount
  onBack: () => void
  onAccountChange: (account: TenantServiceAccount) => void
  onEdit: () => void
  onDelete: () => void
}

export function ServiceAccountDetailsPage({
  tenantSlug,
  account,
  onBack,
  onAccountChange,
  onEdit,
  onDelete,
}: ServiceAccountDetailsPageProps) {
  const [bindRoleAccount, setBindRoleAccount] = useState<TenantServiceAccount | null>(null)
  const [revealedSecret, setRevealedSecret] = useState<TenantSecret | null>(null)

  const tokenSecrets = useMemo(
    () => listServiceAccountTokenSecrets(tenantSlug, account),
    [account, tenantSlug],
  )

  const handleCreateKey = () => {
    const result = createServiceAccountToken(tenantSlug, account.id)
    if (!result) {
      return
    }
    onAccountChange(result.account)
    setRevealedSecret(result.secret)
  }

  const handleViewKey = (secret: TenantSecret) => {
    setRevealedSecret(secret)
  }

  const handleDeleteKey = (secretId: string) => {
    const updated = deleteServiceAccountToken(tenantSlug, account.id, secretId)
    if (updated) {
      onAccountChange(updated)
    }
  }

  const handleBindRole = (roleId: AssignableTenantRoleId) => {
    const updated = bindServiceAccountRole(tenantSlug, account.id, roleId)
    if (updated) {
      onAccountChange(updated)
    }
  }

  const handleUnbindRole = (bindingId: string) => {
    const updated = unbindServiceAccountRole(tenantSlug, account.id, bindingId)
    if (updated) {
      onAccountChange(updated)
    }
  }

  return (
    <>
      <EntityDetailsPageShell
        className="tenant-admin-service-account-details"
        parentLabel={TENANT_SERVICE_ACCOUNTS_DEMO.title}
        onBack={onBack}
        title={account.name}
        titleId="service-account-details-title"
        description={account.description.trim() || undefined}
        icon={renderInventoryCardIcon(SERVICE_ACCOUNT_CARD_ICON)}
        actions={
          <EntityDetailsActionsDropdown
            onEdit={onEdit}
            onRemove={onDelete}
            removeLabel="Delete"
            additionalItems={[
              {
                label: TENANT_SERVICE_ACCOUNTS_DEMO.createKeyLabel,
                onClick: handleCreateKey,
              },
              {
                label: TENANT_SERVICE_ACCOUNTS_DEMO.bindRoleLabel,
                onClick: () => setBindRoleAccount(account),
              },
            ]}
          />
        }
      >
        <div className="entity-details-page__columns entity-details-page__columns--with-rail">
          <div className="entity-details-page__main-stack">
            <div className="entity-details-page__columns entity-details-page__columns--2">
              <div className="entity-details-page__column">
                <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                  Overview
                </Title>
                <DescriptionList
                  isCompact
                  className="entity-details-page__dl"
                  aria-label="Service account overview"
                >
                  <DescriptionListGroup>
                    <DescriptionListTerm>Project</DescriptionListTerm>
                    <DescriptionListDescription>
                      <Label color="green" isCompact>
                        {account.projectName}
                      </Label>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Created</DescriptionListTerm>
                    <DescriptionListDescription>
                      {formatServiceAccountCreatedAtLong(account.createdAt)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </div>

              <div className="entity-details-page__column">
                <Title headingLevel="h2" size="lg" className="entity-details-page__section-title">
                  Details
                </Title>
                <DescriptionList
                  isCompact
                  className="entity-details-page__dl"
                  aria-label="Service account details"
                >
                  <DescriptionListGroup>
                    <DescriptionListTerm>Labels</DescriptionListTerm>
                    <DescriptionListDescription>
                      {account.labels.length > 0 ? (
                        <div className="tenant-admin-service-accounts__labels">
                          {account.labels.map((label) => (
                            <Label key={label} isCompact>
                              {label}
                            </Label>
                          ))}
                        </div>
                      ) : (
                        'No labels'
                      )}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Description</DescriptionListTerm>
                    <DescriptionListDescription>
                      {account.description.trim() || '—'}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </div>
            </div>

            <div className="tenant-admin-service-account-details__related-row">
              <Divider className="entity-details-page__band-divider" />
              <div className="tenant-admin-service-account-details__related-section">
                <div className="entity-details-page__section-header entity-details-page__section-header--related-resources">
                  <Title
                    headingLevel="h2"
                    size="xl"
                    className="entity-details-page__section-title entity-details-page__section-title--related-resources"
                  >
                    Keys
                  </Title>
                  <Button
                    variant="link"
                    isInline
                    icon={<PlusCircleIcon />}
                    className="entity-details-page__add-node-set"
                    onClick={handleCreateKey}
                  >
                    Add
                  </Button>
                </div>
                <Content component="p" className="tenant-admin-service-accounts__section-help">
                  {TENANT_SERVICE_ACCOUNTS_DEMO.keysSectionHelp}
                </Content>
                {tokenSecrets.length === 0 ? (
                  <Content component="p" className="tenant-admin-service-accounts__empty-section">
                    No keys yet. Create a key for tools that need access outside the platform.
                  </Content>
                ) : (
                  <Table
                    aria-label="Service account keys"
                    className="catalog-data-table tenant-admin-service-accounts__related-table"
                  >
                    <Thead>
                      <Tr>
                        <Th>Secret</Th>
                        <Th>Created</Th>
                        <Th screenReaderText="Actions" />
                      </Tr>
                    </Thead>
                    <Tbody>
                      {tokenSecrets.map((secret) => (
                        <Tr key={secret.id}>
                          <Td dataLabel="Secret">
                            <Content
                              component="p"
                              className="tenant-admin-administration__primary-cell"
                            >
                              {secret.name}
                            </Content>
                            <Content
                              component="p"
                              className="tenant-admin-administration__meta-cell"
                            >
                              {getServiceAccountTokenValue(secret) ? 'token' : '—'}
                            </Content>
                          </Td>
                          <Td dataLabel="Created">
                            {formatServiceAccountCreatedAtLong(secret.createdAt)}
                          </Td>
                          <Td isActionCell>
                            <ActionsColumn
                              items={[
                                {
                                  title: 'View key',
                                  onClick: () => handleViewKey(secret),
                                },
                                {
                                  isSeparator: true,
                                },
                                {
                                  title: 'Delete key',
                                  isDanger: true,
                                  onClick: () => handleDeleteKey(secret.id),
                                },
                              ]}
                            />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
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
                    Permissions
                  </Title>
                  <Button
                    variant="link"
                    isInline
                    icon={<PlusCircleIcon />}
                    className="entity-details-page__add-node-set"
                    onClick={() => setBindRoleAccount(account)}
                  >
                    {TENANT_SERVICE_ACCOUNTS_DEMO.bindRoleLabel}
                  </Button>
                </div>
                <Content component="p" className="tenant-admin-service-accounts__section-help">
                  {TENANT_SERVICE_ACCOUNTS_DEMO.rolesSectionHelp}
                </Content>
                {account.roleBindings.length === 0 ? (
                  <Content component="p" className="tenant-admin-service-accounts__empty-section">
                    No roles granted yet.
                  </Content>
                ) : (
                  <ul
                    className="entity-details-page__node-set-list"
                    aria-label="Service account permissions"
                  >
                    {account.roleBindings.map((binding) => {
                      const role = getAssignableTenantRole(binding.roleId)
                      return (
                        <li key={binding.id} className="entity-details-page__node-set-item">
                          <div className="entity-details-page__node-set-item-header">
                            <Label color={role.color} isCompact>
                              {role.label}
                            </Label>
                            <ActionsColumn
                              items={[
                                {
                                  title: 'Remove',
                                  isDanger: true,
                                  onClick: () => handleUnbindRole(binding.id),
                                },
                              ]}
                            />
                          </div>
                          <Content component="p" className="entity-details-page__node-set-meta">
                            {role.description}
                          </Content>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </EntityDetailsPageShell>

      <BindServiceAccountRoleModal
        account={bindRoleAccount}
        onClose={() => setBindRoleAccount(null)}
        onBind={handleBindRole}
      />
      <ServiceAccountTokenRevealModal
        isOpen={revealedSecret !== null}
        secret={revealedSecret}
        serviceAccountName={account.name}
        onClose={() => setRevealedSecret(null)}
      />
    </>
  )
}
