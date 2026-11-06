import {
  Alert,
  Button,
  ClipboardCopy,
  Content,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'
import type { TenantSecret } from '../../tenant/secrets'
import { getServiceAccountTokenValue } from '../../tenantAdmin/serviceAccounts'

type ServiceAccountTokenRevealModalProps = {
  isOpen: boolean
  secret: TenantSecret | null
  serviceAccountName: string
  onClose: () => void
}

export function ServiceAccountTokenRevealModal({
  isOpen,
  secret,
  serviceAccountName,
  onClose,
}: ServiceAccountTokenRevealModalProps) {
  const token = secret ? getServiceAccountTokenValue(secret) : ''

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen && secret !== null}
      onClose={onClose}
      aria-labelledby="service-account-token-reveal-title"
      aria-describedby="service-account-token-reveal-description"
    >
      <ModalHeader
        title={secret ? `Key for ${serviceAccountName}` : 'Service account key'}
        labelId="service-account-token-reveal-title"
      />
      <ModalBody>
        <div
          id="service-account-token-reveal-description"
          className="tenant-admin-service-accounts__credentials"
        >
          <Alert
            variant="warning"
            isInline
            title="Anyone with this key can authenticate as this account."
          />
          <Content component="p" className="tenant-admin-service-accounts__credentials-lede">
            Secret name: <code>{secret?.name ?? '—'}</code>
          </Content>
          <FormGroup label="Key" fieldId="service-account-token-value">
            <ClipboardCopy
              id="service-account-token-value"
              isReadOnly
              hoverTip="Copy key"
              clickTip="Key copied"
              textAriaLabel="Service account key"
            >
              {token}
            </ClipboardCopy>
          </FormGroup>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </ModalFooter>
    </Modal>
  )
}
