import { ExternalLinkAltIcon } from '@patternfly/react-icons/dist/esm/icons/external-link-alt-icon'
import {
  Button,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table'
import {
  formatClusterUpgradeHistoryWhen,
  getClusterUpgradeHistoryStateLabel,
} from '../../tenantUser/clusterUpgrade'
import {
  getClusterVersionShortLabel,
  type TenantClusterUpgradeHistoryEntry,
} from '../../tenantUser/instances'

type ClusterUpgradeHistoryModalProps = {
  isOpen: boolean
  history: readonly TenantClusterUpgradeHistoryEntry[]
  onClose: () => void
}

export function ClusterUpgradeHistoryModal({
  isOpen,
  history,
  onClose,
}: ClusterUpgradeHistoryModalProps) {
  return (
    <Modal
      variant={ModalVariant.medium}
      width="48rem"
      isOpen={isOpen}
      onClose={onClose}
      aria-labelledby="cluster-upgrade-history-modal-title"
      className="cluster-upgrade-history-modal"
    >
      <ModalHeader
        title="Cluster upgrade history"
        labelId="cluster-upgrade-history-modal-title"
        description="Completed and in-progress upgrades for this cluster."
      />
      <ModalBody>
        {history.length === 0 ? (
          <Content component="p" className="entity-details-page__upgrade-history-empty">
            No upgrades yet.
          </Content>
        ) : (
          <Table
            aria-label="Cluster upgrade history"
            variant="compact"
            className="entity-details-page__upgrade-history-table"
          >
            <Thead>
              <Tr>
                <Th>Version</Th>
                <Th>State</Th>
                <Th>Started</Th>
                <Th>Completed</Th>
                <Th>Release notes</Th>
              </Tr>
            </Thead>
            <Tbody>
              {history.map((entry) => (
                <Tr key={entry.id}>
                  <Td
                    dataLabel="Version"
                    className="entity-details-page__upgrade-history-version"
                  >
                    {getClusterVersionShortLabel(entry.toVersion)}
                  </Td>
                  <Td dataLabel="State">{getClusterUpgradeHistoryStateLabel(entry.result)}</Td>
                  <Td dataLabel="Started">{formatClusterUpgradeHistoryWhen(entry.startedAt)}</Td>
                  <Td dataLabel="Completed">
                    {entry.completedAt ? formatClusterUpgradeHistoryWhen(entry.completedAt) : '—'}
                  </Td>
                  <Td dataLabel="Release notes">
                    <Button
                      variant="link"
                      isInline
                      icon={<ExternalLinkAltIcon />}
                      iconPosition="end"
                      className="entity-details-page__upgrade-history-notes-link"
                    >
                      View release notes
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  )
}
