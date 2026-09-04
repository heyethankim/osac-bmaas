import type { TenantSecret, TenantSecretType, TenantSecretUsage } from '../../../tenant/secrets'
import { CreateTenantSecretFlow } from './CreateTenantSecretFlow'

type CreateTenantSecretModalProps = {
  isOpen: boolean
  tenantSlug: string
  initialType?: TenantSecretType
  usage?: TenantSecretUsage
  onClose: () => void
  onCreated: (secret: TenantSecret) => void
}

export function CreateTenantSecretModal({
  isOpen,
  tenantSlug,
  initialType,
  usage = 'general',
  onClose,
  onCreated,
}: CreateTenantSecretModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <CreateTenantSecretFlow
      presentation="modal"
      isOpen
      tenantSlug={tenantSlug}
      initialType={initialType}
      usage={usage}
      onClose={onClose}
      onCreated={onCreated}
    />
  )
}
