import { useCallback, useState } from 'react'
import { PlusIcon } from '@patternfly/react-icons/dist/esm/icons/plus-icon'
import { Button } from '@patternfly/react-core'
import { ProviderAdminWorkspacePageHeader } from '../../components/provider-admin/ProviderAdminWorkspacePageHeader'
import type { ConnectVerificationState } from '../../providerSetup/constants'
import { ProviderSetupConnectStep } from '../provider-setup/ProviderSetupConnectStep'

export function ProviderAdminDataCentersPage() {
  const [verificationState, setVerificationState] = useState<ConnectVerificationState>('verified')

  const handleTestConnection = useCallback(() => {
    setVerificationState('verifying')
    window.setTimeout(() => setVerificationState('verified'), 1400)
  }, [])

  return (
    <div className="provider-admin-workspace-page">
      <ProviderAdminWorkspacePageHeader
        kicker="Infrastructure"
        title="Data centers"
        lede="Enter network addresses and credentials for your physical infrastructure; all secrets are encrypted at rest inside the platform vault."
        action={
          <Button variant="primary" icon={<PlusIcon />} className="provider-admin-workspace-page__action">
            Add data center
          </Button>
        }
      />

      <div className="provider-admin-workspace-page__body">
        <ProviderSetupConnectStep
          workspaceLayout
          verificationState={verificationState}
          onTestConnection={handleTestConnection}
        />
      </div>
    </div>
  )
}
