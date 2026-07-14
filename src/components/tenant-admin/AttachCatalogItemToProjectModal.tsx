import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  Checkbox,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core'
import type { AttachableCatalogOption } from '../../tenantAdmin/catalogItems'
import { getTenantCatalogGovernanceSpecSummary, TENANT_CATALOG_GOVERNANCE_ITEMS } from '../../tenantAdmin/catalogManager'
import {
  isCatalogItemSelected,
  toggleWizardCatalogItemSelection,
} from '../../tenantAdmin/createProjectWizard'
import type { TenantProject, TenantProjectCatalogItem } from '../../tenantAdmin/projects'

type AttachCatalogItemToProjectModalProps = {
  project: TenantProject | null
  catalogOptions: AttachableCatalogOption[]
  onClose: () => void
  onSave: (projectId: string, catalogItems: TenantProjectCatalogItem[]) => void
}

export function AttachCatalogItemToProjectModal({
  project,
  catalogOptions,
  onClose,
  onSave,
}: AttachCatalogItemToProjectModalProps) {
  const [selectedCatalogItems, setSelectedCatalogItems] = useState<TenantProjectCatalogItem[]>([])

  useEffect(() => {
    if (!project) {
      setSelectedCatalogItems([])
      return
    }

    setSelectedCatalogItems(project.catalogItems)
  }, [project])

  const handleSave = () => {
    if (!project) {
      return
    }

    onSave(project.id, selectedCatalogItems)
    onClose()
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={project !== null}
      onClose={onClose}
      aria-labelledby="attach-catalog-item-project-title"
      className="tenant-admin-catalog__attach-modal"
    >
      <ModalHeader title="Manage catalog items" labelId="attach-catalog-item-project-title" />
      <ModalBody>
        {project ? (
          <>
            <DescriptionList isCompact className="tenant-admin-catalog__attach-summary">
              <DescriptionListGroup>
                <DescriptionListTerm>Project</DescriptionListTerm>
                <DescriptionListDescription>{project.name}</DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>

            {catalogOptions.length === 0 ? (
              <Content component="p" className="tenant-admin-catalog__attach-note">
                Create a tenant-scoped catalog item or wait for your provider administrator to
                assign an organization catalog before attaching items to this project.
              </Content>
            ) : (
              <>
                <Content component="p" className="tenant-admin-catalog__attach-note">
                  Select one or more approved catalog items for tenant user provisioning.
                </Content>
                <div
                  className="tenant-admin-projects-teams__catalog-grid"
                  role="group"
                  aria-label="Catalog items"
                >
                  {catalogOptions.map((option) => {
                    const governanceItem = TENANT_CATALOG_GOVERNANCE_ITEMS.find(
                      (item) => item.id === option.id,
                    )

                    return (
                      <Card
                        key={option.id}
                        isCompact
                        className="tenant-admin-projects-teams__catalog-card"
                      >
                        <CardBody className="tenant-admin-projects-teams__catalog-card-body">
                          <Flex
                            alignItems={{ default: 'alignItemsCenter' }}
                            justifyContent={{ default: 'justifyContentSpaceBetween' }}
                            className="tenant-admin-projects-teams__catalog-option"
                          >
                            <FlexItem>
                              <span className="tenant-admin-projects-teams__catalog-radio-label">
                                <span className="tenant-admin-projects-teams__catalog-title">
                                  {option.displayName}
                                </span>
                                <span className="tenant-admin-projects-teams__catalog-badge">
                                  {option.sourceLabel}
                                </span>
                                {governanceItem ? (
                                  <span className="tenant-admin-projects-teams__catalog-specs">
                                    {getTenantCatalogGovernanceSpecSummary(governanceItem)}
                                  </span>
                                ) : null}
                              </span>
                            </FlexItem>
                            <FlexItem>
                              <Checkbox
                                id={`attach-catalog-${option.id}`}
                                isChecked={isCatalogItemSelected(selectedCatalogItems, option.id)}
                                onChange={(_event, isChecked) =>
                                  setSelectedCatalogItems((current) =>
                                    toggleWizardCatalogItemSelection(current, {
                                      id: option.id,
                                      displayName: option.displayName,
                                    }, isChecked),
                                  )
                                }
                                aria-label={option.displayName}
                              />
                            </FlexItem>
                          </Flex>
                        </CardBody>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}
          </>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          isDisabled={!project || catalogOptions.length === 0}
          onClick={handleSave}
        >
          Save catalog items
        </Button>
      </ModalFooter>
    </Modal>
  )
}
