import {
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'
import type { OrganizationExternalIpPool, TenantProject } from '../../tenantAdmin/projects'

type AttachExternalIpPoolToProjectModalProps = {
  project: TenantProject | null
  organizationPool: OrganizationExternalIpPool | null
  onClose: () => void
  onAttach: (projectId: string) => void
}

export function AttachExternalIpPoolToProjectModal({
  project,
  organizationPool,
  onClose,
  onAttach,
}: AttachExternalIpPoolToProjectModalProps) {
  const handleAttach = () => {
    if (!project) {
      return
    }

    onAttach(project.id)
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={project !== null}
      onClose={onClose}
      aria-labelledby="attach-external-ip-pool-project-title"
      className="tenant-admin-quota-distribution__attach-modal"
    >
      <ModalHeader
        title="Attach external IP pool"
        labelId="attach-external-ip-pool-project-title"
      />
      <ModalBody>
        {project && organizationPool ? (
          <>
            <DescriptionList isCompact className="tenant-admin-quota-distribution__attach-summary">
              <DescriptionListGroup>
                <DescriptionListTerm>Project</DescriptionListTerm>
                <DescriptionListDescription>{project.name}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Organization pool</DescriptionListTerm>
                <DescriptionListDescription>
                  {organizationPool.name} · <code>{organizationPool.cidr}</code>
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
            <Content component="p" className="tenant-admin-quota-distribution__attach-note">
              This project will use your organization&apos;s assigned external IP pool for routable
              public address exposure. Only the pool inherited from your provider administrator can
              be attached.
            </Content>
          </>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          isDisabled={!project || !organizationPool}
          onClick={handleAttach}
        >
          Attach pool
        </Button>
      </ModalFooter>
    </Modal>
  )
}
