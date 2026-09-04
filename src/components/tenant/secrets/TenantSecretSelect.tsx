import { useMemo, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import {
  Divider,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
} from '@patternfly/react-core'
import {
  ensureTenantDemoSecrets,
  filterTenantSecretsForLaunch,
  getTenantSecretTypeForLaunchPurpose,
  resolvePullSecretValue,
  resolveSshPublicKeySecretValue,
  type LaunchSecretPurpose,
  type TenantSecret,
  type TenantSecretUsage,
} from '../../../tenant/secrets'
import { CreateTenantSecretModal } from './CreateTenantSecretModal'

type TenantSecretSelectProps = {
  id: string
  tenantSlug: string
  purpose: LaunchSecretPurpose
  selectedSecretId: string
  onChange: (selection: {
    secretId: string
    resolvedValue: string
    secretName: string
  }) => void
  ariaLabel: string
  placeholder?: string
  className?: string
  usage?: TenantSecretUsage
}

function resolveLaunchSecretValue(secret: TenantSecret, purpose: LaunchSecretPurpose): string {
  return purpose === 'ssh-public-key'
    ? resolveSshPublicKeySecretValue(secret) ?? ''
    : resolvePullSecretValue(secret) ?? ''
}

export function TenantSecretSelect({
  id,
  tenantSlug,
  purpose,
  selectedSecretId,
  onChange,
  ariaLabel,
  placeholder = 'Select a secret',
  className,
  usage = 'general',
}: TenantSecretSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [secrets, setSecrets] = useState(() => ensureTenantDemoSecrets(tenantSlug))
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const options = useMemo(
    () => filterTenantSecretsForLaunch(secrets, purpose),
    [purpose, secrets],
  )

  const selectedSecret = options.find((secret) => secret.id === selectedSecretId) ?? null
  const toggleLabel = selectedSecret?.name ?? placeholder

  const refreshSecrets = () => {
    setSecrets(ensureTenantDemoSecrets(tenantSlug))
  }

  const handleSelectSecret = (secret: TenantSecret) => {
    onChange({
      secretId: secret.id,
      resolvedValue: resolveLaunchSecretValue(secret, purpose),
      secretName: secret.name,
    })
    setIsOpen(false)
  }

  const handleCreated = (secret: TenantSecret) => {
    refreshSecrets()
    if (filterTenantSecretsForLaunch([secret], purpose).length > 0) {
      handleSelectSecret(secret)
    }
  }

  return (
    <>
      <Dropdown
        className={['tenant-secret-select', className].filter(Boolean).join(' ')}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        popperProps={{ appendTo: () => document.body }}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            id={id}
            isExpanded={isOpen}
            onClick={() => setIsOpen((open) => !open)}
            aria-label={ariaLabel}
            isFullWidth
            className="bmaas-dropdown-toggle tenant-secret-select__toggle"
          >
            {toggleLabel}
          </MenuToggle>
        )}
      >
        <DropdownList>
          {options.length === 0 ? (
            <DropdownItem isAriaDisabled isDisabled>
              No secrets available
            </DropdownItem>
          ) : (
            options.map((secret) => (
              <DropdownItem
                key={secret.id}
                value={secret.id}
                isSelected={selectedSecretId === secret.id}
                onClick={() => handleSelectSecret(secret)}
              >
                {secret.name}
              </DropdownItem>
            ))
          )}
          <Divider component="li" />
          <DropdownItem
            icon={<PlusIcon aria-hidden />}
            onClick={() => {
              setIsOpen(false)
              setIsCreateModalOpen(true)
            }}
          >
            Create secret
          </DropdownItem>
        </DropdownList>
      </Dropdown>

      <CreateTenantSecretModal
        isOpen={isCreateModalOpen}
        tenantSlug={tenantSlug}
        initialType={getTenantSecretTypeForLaunchPurpose(purpose)}
        usage={usage}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleCreated}
      />
    </>
  )
}
