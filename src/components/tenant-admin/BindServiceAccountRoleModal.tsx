import { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Content,
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'
import {
  ASSIGNABLE_TENANT_ROLES,
  getAssignableTenantRole,
  type AssignableTenantRoleId,
} from '../../tenantAdmin/administrators'
import {
  TENANT_SERVICE_ACCOUNTS_DEMO,
  type TenantServiceAccount,
} from '../../tenantAdmin/serviceAccounts'

type BindServiceAccountRoleModalProps = {
  account: TenantServiceAccount | null
  onClose: () => void
  onBind: (roleId: AssignableTenantRoleId) => void
}

export function BindServiceAccountRoleModal({
  account,
  onClose,
  onBind,
}: BindServiceAccountRoleModalProps) {
  const boundRoleIds = useMemo(
    () => new Set(account?.roleBindings.map((binding) => binding.roleId) ?? []),
    [account],
  )
  const availableRoles = useMemo(
    () => ASSIGNABLE_TENANT_ROLES.filter((role) => !boundRoleIds.has(role.id)),
    [boundRoleIds],
  )
  const [roleId, setRoleId] = useState<AssignableTenantRoleId | ''>('')

  useEffect(() => {
    if (!account) {
      setRoleId('')
      return
    }
    setRoleId(availableRoles[0]?.id ?? '')
  }, [account, availableRoles])

  const selectedRole = roleId ? getAssignableTenantRole(roleId) : null
  const canBind = Boolean(account && roleId)

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={account !== null}
      onClose={onClose}
      aria-labelledby="bind-service-account-role-title"
    >
      <ModalHeader
        title={TENANT_SERVICE_ACCOUNTS_DEMO.bindRoleLabel}
        labelId="bind-service-account-role-title"
        description={account ? `Grant ${account.name} a tenant role.` : undefined}
      />
      <ModalBody>
        {availableRoles.length === 0 ? (
          <Content component="p">
            This service account already has every available tenant role.
          </Content>
        ) : (
          <Form className="tenant-admin-service-accounts__bind-role-form">
            <FormGroup label="Role" fieldId="bind-service-account-role" isRequired>
              <FormSelect
                id="bind-service-account-role"
                value={roleId}
                onChange={(_event, value) => setRoleId(value as AssignableTenantRoleId)}
                aria-label="Role"
              >
                {availableRoles.map((role) => (
                  <FormSelectOption key={role.id} value={role.id} label={role.label} />
                ))}
              </FormSelect>
            </FormGroup>
            {selectedRole ? (
              <Content component="p" className="tenant-admin-service-accounts__bind-role-help">
                {selectedRole.description}
              </Content>
            ) : null}
          </Form>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={() => {
            if (!roleId) {
              return
            }
            onBind(roleId)
            onClose()
          }}
          isDisabled={!canBind}
        >
          {TENANT_SERVICE_ACCOUNTS_DEMO.bindRoleLabel}
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
