import { useEffect, useMemo, useState } from 'react'
import { CheckIcon } from '@patternfly/react-icons/dist/esm/icons/check-icon'
import { ExclamationTriangleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-triangle-icon'
import {
  Alert,
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
import { getCatalogClusterVersionOption } from '../../catalog/catalogPublishConfig'
import { CatalogClusterVersionValue } from '../catalog/CatalogClusterVersionValue'
import {
  getDefaultClusterUpgradeTargetId,
  listClusterUpgradeTargetOptions,
} from '../../tenantUser/clusterUpgrade'
import {
  getClusterDesiredVersionLabel,
  getClusterPlatformLabel,
  type TenantInstance,
} from '../../tenantUser/instances'

type ClusterUpgradeWizardProps = {
  isOpen: boolean
  instance: TenantInstance
  onClose: () => void
  onStartUpgrade: (targetVersionLabel: string) => void
}

export function ClusterUpgradeWizard({
  isOpen,
  instance,
  onClose,
  onStartUpgrade,
}: ClusterUpgradeWizardProps) {
  const currentVersion = getClusterPlatformLabel(instance)
  const preferredTarget = getClusterDesiredVersionLabel(instance)
  const targets = useMemo(
    () => listClusterUpgradeTargetOptions(currentVersion),
    [currentVersion],
  )
  const [selectedTargetId, setSelectedTargetId] = useState(() =>
    getDefaultClusterUpgradeTargetId(currentVersion, preferredTarget),
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setSelectedTargetId(getDefaultClusterUpgradeTargetId(currentVersion, preferredTarget))
  }, [isOpen, currentVersion, preferredTarget, instance.id])

  const selectedTarget =
    getCatalogClusterVersionOption(selectedTargetId) ?? targets[0] ?? null
  const canUpdate = Boolean(selectedTarget)

  const handleSubmit = () => {
    if (!selectedTarget) {
      return
    }
    onStartUpgrade(selectedTarget.label)
  }

  return (
    <Modal
      variant={ModalVariant.small}
      width="40rem"
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="cluster-upgrade-modal-title"
      className="cluster-upgrade-modal"
    >
      <ModalHeader title="Upgrade cluster" labelId="cluster-upgrade-modal-title" />
      <ModalBody>
        <Form className="cluster-upgrade-modal__form">
          <Content component="p" className="cluster-upgrade-modal__lede">
            The control plane and all node sets upgrade together and typically take about 15
            minutes.
          </Content>

          <FormGroup
            label="Current version"
            fieldId="cluster-upgrade-current-version"
            className="cluster-upgrade-modal__current-version"
          >
            <CatalogClusterVersionValue>{currentVersion}</CatalogClusterVersionValue>
          </FormGroup>

          <FormGroup label="Target version" isRequired fieldId="cluster-upgrade-target-version">
            <FormSelect
              id="cluster-upgrade-target-version"
              value={selectedTargetId}
              onChange={(_event, value) => setSelectedTargetId(value)}
              aria-label="Target version"
            >
              {targets.length === 0 ? (
                <FormSelectOption value="" label="No newer versions available" isDisabled />
              ) : (
                targets.map((option) => (
                  <FormSelectOption key={option.id} value={option.id} label={option.label} />
                ))
              )}
            </FormSelect>
            {selectedTarget ? (
              <aside
                className="cluster-upgrade-modal__target-offer"
                aria-label={`Included in ${selectedTarget.label}`}
              >
                <span className="cluster-upgrade-modal__target-offer-eyebrow">
                  Included in this version
                </span>
                {selectedTarget.features.length > 0 ? (
                  <ul className="cluster-upgrade-modal__target-features">
                    {selectedTarget.features.map((feature) => (
                      <li key={feature} className="cluster-upgrade-modal__target-feature">
                        <CheckIcon
                          className="cluster-upgrade-modal__target-feature-icon"
                          aria-hidden
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </aside>
            ) : null}
          </FormGroup>

          <Alert
            variant="warning"
            isInline
            isPlain
            title="Cluster upgrades are irreversible"
            customIcon={<ExclamationTriangleIcon />}
            className="cluster-upgrade-modal__warning"
          >
            <Content component="p">
              After an upgrade begins, you cannot roll back to the previous version.
            </Content>
          </Alert>
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={handleSubmit} isDisabled={!canUpdate}>
          Upgrade cluster
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  )
}
