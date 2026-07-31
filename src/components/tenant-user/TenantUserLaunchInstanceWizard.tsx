import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeftIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-left-icon'
import { ArrowRightIcon } from '@patternfly/react-icons/dist/esm/icons/arrow-right-icon'
import { CheckIcon } from '@patternfly/react-icons/dist/esm/icons/check-icon'
import { InfoCircleIcon } from '@patternfly/react-icons/dist/esm/icons/info-circle-icon'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import {
  Alert,
  Button,
  Card,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  Modal,
  ModalVariant,
  Spinner,
  TextArea,
  TextInput,
  Wizard,
  WizardHeader,
  WizardStep,
} from '@patternfly/react-core'
import type { RegisteredOrganization } from '../../providerAdmin/organizations'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import type { CatalogServiceId } from '../../providerSetup/templateDemo'
import { resolveCatalogSpecRows } from '../../catalog/catalogSpecs'
import type { TenantUserCatalogCard } from '../../tenantUser/catalog'
import { PlusCircleIcon } from '@patternfly/react-icons/dist/esm/icons/plus-circle-icon'
import {
  createDefaultClusterNodeSet,
  createLaunchInstanceWizardForm,
  getLaunchInstanceWizardSteps,
  getNextLaunchInstanceName,
  getLaunchInstanceNamePlaceholder,
  isClusterConfigureStepValid,
  isClusterGeneralStepValid,
  isClusterNetworkingStepValid,
  isInstanceNameValid,
  isVmConfigureStepValid,
  isVmGeneralStepValid,
  isVmNetworkingStepValid,
  isBareMetalGeneralStepValid,
  BAREMETAL_LAUNCH_INSTANCE_DEMO,
  CLUSTER_LAUNCH_INSTANCE_DEMO,
  LAUNCH_INSTANCE_BOOT_LOG_STEP_MS,
  LAUNCH_INSTANCE_PROVISIONING_SETTLE_MS,
  LAUNCH_INSTANCE_WIZARD_DEMO,
  PROVISIONING_BOOT_LOG_STEPS,
  VM_LAUNCH_INSTANCE_DEMO,
  type LaunchInstanceWizardForm,
  type LaunchInstanceWizardStepId,
  type ProvisioningBootLogStatus,
} from '../../tenantUser/launchInstanceWizard'
import {
  formatLaunchInstanceNetworkLabel,
  getLaunchNetworkFieldLabel,
  resolveLaunchInstanceNetworking,
  resolveLaunchNetworkContext,
  type LaunchNetworkFieldView,
} from '../../tenantUser/launchNetworking'
import {
  getCatalogSecurityGroupOptions,
  getCatalogSubnetOptions,
  getCatalogVirtualNetworkOptions,
} from '../../providerSetup/storage'
import { formatTenantInstanceName, generateTenantInstanceId, type TenantInstance } from '../../tenantUser/instances'
import type { TenantUserScopeKind } from '../../tenantUser/scope'

type TenantUserLaunchInstanceWizardProps = {
  isOpen: boolean
  catalogItem: TenantUserCatalogCard
  organization: RegisteredOrganization | null
  catalogDraft: ProviderCatalogDraft | null
  preferCatalogDraft?: boolean
  scopeKind: TenantUserScopeKind
  scopeLabel: string
  scopeFieldLabel: 'Organization' | 'Project'
  existingInstanceNames?: readonly string[]
  onClose: () => void
  onProvisioningStarted: (instance: TenantInstance) => void
  onDismissDuringProvisioning: (instanceId: string, serviceId: CatalogServiceId) => void
  onWizardFinished: (instanceId: string, serviceId: CatalogServiceId) => void
}

function getBootLogStatus(
  stepIndex: number,
  activeIndex: number,
): ProvisioningBootLogStatus {
  if (stepIndex < activeIndex) {
    return 'completed'
  }

  if (stepIndex === activeIndex) {
    return 'in-progress'
  }

  return 'pending'
}

function AssignedNetworkField({ field }: { field: LaunchNetworkFieldView }) {
  return (
    <div className="tenant-user-launch-wizard__assigned-field">
      <Content component="p" className="tenant-user-launch-wizard__assigned-label">
        {field.label}
      </Content>
      <Content component="p" className="tenant-user-launch-wizard__assigned-value">
        {field.value}
      </Content>
      <Content component="p" className="tenant-user-launch-wizard__assigned-helper">
        {LAUNCH_INSTANCE_WIZARD_DEMO.networkingAssignedHelper}
      </Content>
    </div>
  )
}

export function TenantUserLaunchInstanceWizard({
  isOpen,
  catalogItem,
  organization,
  catalogDraft,
  preferCatalogDraft = false,
  scopeKind,
  scopeLabel,
  scopeFieldLabel,
  existingInstanceNames = [],
  onClose,
  onProvisioningStarted,
  onDismissDuringProvisioning,
  onWizardFinished,
}: TenantUserLaunchInstanceWizardProps) {
  const networkContext = useMemo(
    () =>
      resolveLaunchNetworkContext(
        organization,
        catalogDraft,
        preferCatalogDraft,
        catalogItem.catalogItemId,
      ),
    [organization, catalogDraft, preferCatalogDraft, catalogItem.catalogItemId],
  )
  const isClusterCatalogItem = catalogItem.serviceId === 'cluster'
  const isVmCatalogItem = catalogItem.serviceId === 'virtual-machine'
  const isBareMetalCatalogItem = catalogItem.serviceId === 'baremetal'
  const isServiceAwareCatalogItem = isClusterCatalogItem || isVmCatalogItem
  const usesGeneralFirstStep =
    isClusterCatalogItem || isVmCatalogItem || isBareMetalCatalogItem
  const catalogDetailSpecRows = useMemo(
    () =>
      isServiceAwareCatalogItem
        ? resolveCatalogSpecRows(
            {
              serviceId: catalogItem.serviceId,
              templateRefId: catalogItem.templateRefId,
              templateName: catalogItem.templateName,
            },
            { includeDetails: true },
          )
        : catalogItem.specRows,
    [
      isServiceAwareCatalogItem,
      catalogItem.serviceId,
      catalogItem.templateRefId,
      catalogItem.templateName,
      catalogItem.specRows,
    ],
  )
  const includeNetworkingStep = networkContext.enabled && networkContext.hasEditableFields
  const wizardSteps = useMemo(
    () =>
      getLaunchInstanceWizardSteps({
        includeNetworking: includeNetworkingStep,
        serviceId: catalogItem.serviceId,
      }),
    [includeNetworkingStep, catalogItem.serviceId],
  )

  const [form, setForm] = useState<LaunchInstanceWizardForm>(() =>
    createLaunchInstanceWizardForm({
      virtualNetworkId: networkContext.policy.virtualNetwork.id,
      subnetId: networkContext.policy.subnet.id,
      securityGroupId: networkContext.policy.securityGroup.id,
      serviceId: catalogItem.serviceId,
      instanceName: getNextLaunchInstanceName(existingInstanceNames, catalogItem.serviceId),
    }),
  )
  const [activeStepId, setActiveStepId] = useState<LaunchInstanceWizardStepId>(
    usesGeneralFirstStep ? 'general' : 'configure',
  )
  const [activeBootLogIndex, setActiveBootLogIndex] = useState(0)
  const [isProvisioningComplete, setIsProvisioningComplete] = useState(false)
  const provisioningStartedRef = useRef(false)
  const provisioningInstanceIdRef = useRef<string | null>(null)
  const isOpenRef = useRef(isOpen)
  const onProvisioningStartedRef = useRef(onProvisioningStarted)
  const onWizardFinishedRef = useRef(onWizardFinished)

  onProvisioningStartedRef.current = onProvisioningStarted
  onWizardFinishedRef.current = onWizardFinished

  const activeStepDescription =
    wizardSteps.find((step) => step.id === activeStepId)?.description ?? ''

  const networkSelections = {
    virtualNetworkId: form.virtualNetworkId || networkContext.policy.virtualNetwork.id,
    subnetId: form.subnetId || networkContext.policy.subnet.id,
    securityGroupId: form.securityGroupId || networkContext.policy.securityGroup.id,
  }

  const networkLabel = isClusterCatalogItem
    ? `Pod ${form.podCidr.trim()} · Service ${form.serviceCidr.trim()}`
    : formatLaunchInstanceNetworkLabel(networkContext, networkSelections)
  const networking = resolveLaunchInstanceNetworking(networkContext, networkSelections)
  const assignedNetworkSummary = networkContext.assignedNetworkSummary
  const securityGroupField = networkContext.fields.find(
    (field) => field.kind === 'security-group',
  )
  const securityGroupLabel = securityGroupField
    ? getLaunchNetworkFieldLabel(securityGroupField, networkSelections.securityGroupId)
    : networkContext.policy.securityGroup.name

  const resetWizard = () => {
    setForm(
      createLaunchInstanceWizardForm({
        virtualNetworkId: networkContext.policy.virtualNetwork.id,
        subnetId: networkContext.policy.subnet.id,
        securityGroupId: networkContext.policy.securityGroup.id,
        serviceId: catalogItem.serviceId,
        instanceName: getNextLaunchInstanceName(
          existingInstanceNames,
          catalogItem.serviceId,
        ),
      }),
    )
    setActiveStepId(usesGeneralFirstStep ? 'general' : 'configure')
    setActiveBootLogIndex(0)
    setIsProvisioningComplete(false)
    provisioningStartedRef.current = false
    provisioningInstanceIdRef.current = null
  }

  const handleClose = () => {
    const provisioningId = provisioningInstanceIdRef.current
    // Any close after provisioning has started should land on Services.
    if (provisioningId) {
      onDismissDuringProvisioning(provisioningId, catalogItem.serviceId)
      resetWizard()
      onClose()
      return
    }

    resetWizard()
    onClose()
  }

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      resetWizard()
      return
    }

    setForm(
      createLaunchInstanceWizardForm({
        virtualNetworkId: networkContext.policy.virtualNetwork.id,
        subnetId: networkContext.policy.subnet.id,
        securityGroupId: networkContext.policy.securityGroup.id,
        serviceId: catalogItem.serviceId,
        instanceName: getNextLaunchInstanceName(
          existingInstanceNames,
          catalogItem.serviceId,
        ),
      }),
    )
    setActiveStepId(usesGeneralFirstStep ? 'general' : 'configure')
  }, [isOpen, networkContext, existingInstanceNames, catalogItem.serviceId, usesGeneralFirstStep])

  useEffect(() => {
    if (!isOpen || activeStepId !== 'provisioning' || provisioningStartedRef.current) {
      return
    }

    provisioningStartedRef.current = true

    const detailSpecRows = catalogDetailSpecRows

    const instance: TenantInstance = {
      id: generateTenantInstanceId(),
      name:
        isClusterCatalogItem || isVmCatalogItem || isBareMetalCatalogItem
          ? form.instanceName.trim()
          : formatTenantInstanceName(form.instanceName.trim()),
      catalogItemDisplayName: catalogItem.displayName,
      serviceId: catalogItem.serviceId,
      hardwareProfile: catalogItem.hardwareProfile,
      osImage: isClusterCatalogItem
        ? (detailSpecRows.find((row) => row.label === 'Platform')?.value ?? catalogItem.osImage)
        : isVmCatalogItem
          ? form.containerDiskImage.trim() || catalogItem.osImage
          : catalogItem.osImage,
      networkLabel,
      networking,
      gpuLabel: isClusterCatalogItem
        ? (detailSpecRows.find((row) => row.label === 'Node set')?.value ?? catalogItem.gpu)
        : isVmCatalogItem
          ? form.instanceType.trim() || catalogItem.gpu
          : catalogItem.gpu,
      specRows: isServiceAwareCatalogItem
        ? isVmCatalogItem
          ? [
              { label: 'Container disk image', value: form.containerDiskImage.trim() },
              { label: 'Instance type', value: form.instanceType.trim() },
              { label: 'Boot disk', value: `${form.bootDiskSizeGiB} GiB` },
              ...(form.cloudInitUserData.trim()
                ? [{ label: 'Cloud-init', value: form.cloudInitUserData.trim() }]
                : []),
            ]
          : [
              { label: 'Release image', value: form.releaseImage.trim() },
              ...form.nodeSets.map((nodeSet, index) => ({
                label: `Node set ${index + 1}`,
                value: `${nodeSet.hostType} · ${nodeSet.nodeCount} ${
                  nodeSet.nodeCount === 1 ? 'node' : 'nodes'
                }`,
              })),
              { label: 'Pod CIDR', value: form.podCidr.trim() },
              { label: 'Service CIDR', value: form.serviceCidr.trim() },
            ]
        : isBareMetalCatalogItem && form.cloudInitUserData.trim()
          ? [
              ...catalogItem.specRows,
              { label: 'User data', value: form.cloudInitUserData.trim() },
            ]
          : catalogItem.specRows,
      clusterConfig: isClusterCatalogItem
        ? {
            releaseImage: form.releaseImage.trim(),
            podCidr: form.podCidr.trim(),
            serviceCidr: form.serviceCidr.trim(),
            catalogShortName: 'ocp-small',
            creator: 'Alex Johnson',
            nodeSets: form.nodeSets.map((nodeSet) => ({
              id: nodeSet.id,
              hostType: nodeSet.hostType,
              nodeCount: nodeSet.nodeCount,
            })),
          }
        : undefined,
      sshPublicKey: isBareMetalCatalogItem || isVmCatalogItem ? form.sshPublicKey.trim() : undefined,
      vmConfig: isVmCatalogItem
        ? {
            instanceType: form.instanceType.trim() || 'small - 1 vCPU, 2 GiB',
            containerDiskImage:
              form.containerDiskImage.trim() || 'quay.io/containerdisks/fedora:latest',
            bootDiskSizeGiB: form.bootDiskSizeGiB,
            sshPublicKey: form.sshPublicKey.trim(),
            internalIp: '10.99.1.11',
            publicIp: null,
            publicIpFamily: null,
          }
        : undefined,
      projectName: scopeLabel,
      scopeKind,
      status: 'provisioning',
      createdAt: new Date().toISOString(),
      provisionedAt: null,
    }

    provisioningInstanceIdRef.current = instance.id
    onProvisioningStartedRef.current(instance)

    const totalSteps = PROVISIONING_BOOT_LOG_STEPS.length
    let stepIndex = 0
    let settleTimeoutId: number | undefined

    const intervalId = window.setInterval(() => {
      stepIndex += 1
      setActiveBootLogIndex(stepIndex)

      if (stepIndex >= totalSteps) {
        window.clearInterval(intervalId)
        setIsProvisioningComplete(true)

        settleTimeoutId = window.setTimeout(() => {
          const instanceId = provisioningInstanceIdRef.current
          if (isOpenRef.current && instanceId) {
            onWizardFinishedRef.current(instanceId, catalogItem.serviceId)
            resetWizard()
          }
        }, LAUNCH_INSTANCE_PROVISIONING_SETTLE_MS)
      }
    }, LAUNCH_INSTANCE_BOOT_LOG_STEP_MS)

    return () => {
      window.clearInterval(intervalId)
      if (settleTimeoutId !== undefined) {
        window.clearTimeout(settleTimeoutId)
      }
    }
    // Intentionally start once when entering provisioning; callbacks via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- provisioning snapshot
  }, [isOpen, activeStepId])

  const updateNetworkSelection = (
    kind: LaunchNetworkFieldView['kind'],
    value: string,
  ) => {
    setForm((current) => {
      if (kind === 'virtual-network') {
        const nextSubnetId =
          getCatalogSubnetOptions(value).find((option) => option.id === current.subnetId)?.id ??
          getCatalogSubnetOptions(value)[0]?.id ??
          current.subnetId
        return { ...current, virtualNetworkId: value, subnetId: nextSubnetId }
      }
      if (kind === 'subnet') {
        return { ...current, subnetId: value }
      }
      return { ...current, securityGroupId: value }
    })
  }

  const getSelectedIdForField = (field: LaunchNetworkFieldView): string => {
    if (field.kind === 'virtual-network') {
      return networkSelections.virtualNetworkId
    }
    if (field.kind === 'subnet') {
      return networkSelections.subnetId
    }
    return networkSelections.securityGroupId
  }

  const renderGeneralStep = () => {
    const nameFieldId = isBareMetalCatalogItem
      ? 'launch-bm-name'
      : isVmCatalogItem
        ? 'launch-vm-name'
        : 'launch-cluster-name'
    const sshFieldId = isBareMetalCatalogItem
      ? 'launch-bm-ssh-key'
      : isVmCatalogItem
        ? 'launch-vm-ssh-key'
        : 'launch-cluster-ssh-key'
    const nameHelper = isBareMetalCatalogItem
      ? BAREMETAL_LAUNCH_INSTANCE_DEMO.nameHelper
      : isVmCatalogItem
        ? VM_LAUNCH_INSTANCE_DEMO.nameHelper
        : CLUSTER_LAUNCH_INSTANCE_DEMO.nameHelper
    const sshHelper = isBareMetalCatalogItem
      ? BAREMETAL_LAUNCH_INSTANCE_DEMO.sshHelper
      : isVmCatalogItem
        ? VM_LAUNCH_INSTANCE_DEMO.sshHelper
        : CLUSTER_LAUNCH_INSTANCE_DEMO.sshHelper

    return (
      <div className="tenant-user-launch-wizard__step">
        <Form autoComplete="off" className="tenant-user-launch-wizard__form">
          <FormGroup label="Name" fieldId={nameFieldId} isRequired>
            <TextInput
              id={nameFieldId}
              value={form.instanceName}
              onChange={(_event, value) =>
                setForm((current) => ({ ...current, instanceName: value }))
              }
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>{nameHelper}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          <FormGroup label="SSH public key" fieldId={sshFieldId} isRequired>
            <TextArea
              id={sshFieldId}
              value={form.sshPublicKey}
              onChange={(_event, value) =>
                setForm((current) => ({ ...current, sshPublicKey: value }))
              }
              resizeOrientation="vertical"
              rows={4}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>{sshHelper}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>

          {isClusterCatalogItem ? (
            <FormGroup label="Pull secret" fieldId="launch-cluster-pull-secret" isRequired>
              <TextArea
                id="launch-cluster-pull-secret"
                value={form.pullSecret}
                onChange={(_event, value) =>
                  setForm((current) => ({ ...current, pullSecret: value }))
                }
                resizeOrientation="vertical"
                rows={8}
              />
            </FormGroup>
          ) : null}
        </Form>
      </div>
    )
  }

  const renderBareMetalConfigureStep = () => (
    <div className="tenant-user-launch-wizard__step">
      <Form autoComplete="off" className="tenant-user-launch-wizard__form">
        <FormGroup label="User data" fieldId="launch-bm-user-data">
          <TextArea
            id="launch-bm-user-data"
            value={form.cloudInitUserData}
            onChange={(_event, value) =>
              setForm((current) => ({ ...current, cloudInitUserData: value }))
            }
            resizeOrientation="vertical"
            rows={10}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{BAREMETAL_LAUNCH_INSTANCE_DEMO.userDataHelper}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </Form>
    </div>
  )

  const renderVmConfigureStep = () => (
    <div className="tenant-user-launch-wizard__step">
      <Form autoComplete="off" className="tenant-user-launch-wizard__form">
        <FormGroup label="Container Disk Image" fieldId="launch-vm-container-disk" isRequired>
          <TextInput
            id="launch-vm-container-disk"
            value={form.containerDiskImage}
            onChange={(_event, value) =>
              setForm((current) => ({ ...current, containerDiskImage: value }))
            }
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{VM_LAUNCH_INSTANCE_DEMO.containerDiskImageHelper}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <FormGroup label="Instance type" fieldId="launch-vm-instance-type" isRequired>
          <FormSelect
            id="launch-vm-instance-type"
            value={form.instanceType}
            onChange={(_event, value) =>
              setForm((current) => ({ ...current, instanceType: value }))
            }
            aria-label="Instance type"
          >
            {VM_LAUNCH_INSTANCE_DEMO.instanceTypeOptions.map((option) => (
              <FormSelectOption key={option} value={option} label={option} />
            ))}
          </FormSelect>
        </FormGroup>

        <FormGroup label="Boot Disk Size (GiB)" fieldId="launch-vm-boot-disk" isRequired>
          <TextInput
            id="launch-vm-boot-disk"
            type="number"
            min={1}
            value={String(form.bootDiskSizeGiB)}
            onChange={(_event, value) => {
              const parsed = Number.parseInt(value, 10)
              setForm((current) => ({
                ...current,
                bootDiskSizeGiB: Number.isNaN(parsed) ? 1 : Math.max(1, parsed),
              }))
            }}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{VM_LAUNCH_INSTANCE_DEMO.bootDiskSizeHelper}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <FormGroup label="Cloud Init User Data" fieldId="launch-vm-cloud-init" isRequired>
          <TextArea
            id="launch-vm-cloud-init"
            value={form.cloudInitUserData}
            onChange={(_event, value) =>
              setForm((current) => ({ ...current, cloudInitUserData: value }))
            }
            resizeOrientation="vertical"
            rows={6}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{VM_LAUNCH_INSTANCE_DEMO.cloudInitHelper}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </Form>
    </div>
  )

  const renderVmNetworkingStep = () => {
    const virtualNetworkOptions = getCatalogVirtualNetworkOptions()
    const subnetOptions = getCatalogSubnetOptions(networkSelections.virtualNetworkId)
    const securityGroupOptions = getCatalogSecurityGroupOptions()

    return (
      <div className="tenant-user-launch-wizard__step">
        <Form autoComplete="off" className="tenant-user-launch-wizard__form">
          <FormGroup label="Virtual network" fieldId="launch-vm-virtual-network" isRequired>
            <FormSelect
              id="launch-vm-virtual-network"
              value={networkSelections.virtualNetworkId}
              onChange={(_event, value) => updateNetworkSelection('virtual-network', value)}
              aria-label="Virtual network"
            >
              {virtualNetworkOptions.map((option) => (
                <FormSelectOption key={option.id} value={option.id} label={option.name} />
              ))}
            </FormSelect>
          </FormGroup>

          <FormGroup label="Subnet" fieldId="launch-vm-subnet" isRequired>
            <FormSelect
              id="launch-vm-subnet"
              value={networkSelections.subnetId}
              onChange={(_event, value) => updateNetworkSelection('subnet', value)}
              aria-label="Subnet"
            >
              {subnetOptions.map((option) => (
                <FormSelectOption key={option.id} value={option.id} label={option.name} />
              ))}
            </FormSelect>
          </FormGroup>

          <FormGroup label="Security groups" fieldId="launch-vm-security-groups" isRequired>
            <FormSelect
              id="launch-vm-security-groups"
              value={networkSelections.securityGroupId}
              onChange={(_event, value) => updateNetworkSelection('security-group', value)}
              aria-label="Security groups"
            >
              {securityGroupOptions.map((option) => (
                <FormSelectOption key={option.id} value={option.id} label={option.name} />
              ))}
            </FormSelect>
          </FormGroup>
        </Form>
      </div>
    )
  }

  const renderClusterConfigureStep = () => (
    <div className="tenant-user-launch-wizard__step">
      <Form autoComplete="off" className="tenant-user-launch-wizard__form">
        <FormGroup label="Release image" fieldId="launch-cluster-release-image" isRequired>
          <TextInput
            id="launch-cluster-release-image"
            value={form.releaseImage}
            onChange={(_event, value) => setForm((current) => ({ ...current, releaseImage: value }))}
          />
        </FormGroup>

        <div className="tenant-user-launch-wizard__node-sets">
          <Content component="h3" className="tenant-user-launch-wizard__node-sets-title">
            Node Sets
          </Content>

          {form.nodeSets.map((nodeSet, index) => (
            <div key={nodeSet.id} className="tenant-user-launch-wizard__node-set">
              <Content component="p" className="tenant-user-launch-wizard__node-set-heading">
                Node set {index + 1}
              </Content>

              <FormGroup
                label="Host type"
                fieldId={`launch-cluster-host-type-${nodeSet.id}`}
                isRequired
              >
                <FormSelect
                  id={`launch-cluster-host-type-${nodeSet.id}`}
                  value={nodeSet.hostType}
                  onChange={(_event, value) =>
                    setForm((current) => ({
                      ...current,
                      nodeSets: current.nodeSets.map((entry) =>
                        entry.id === nodeSet.id ? { ...entry, hostType: value } : entry,
                      ),
                    }))
                  }
                  aria-label={`Host type for node set ${index + 1}`}
                >
                  {CLUSTER_LAUNCH_INSTANCE_DEMO.hostTypeOptions.map((option) => (
                    <FormSelectOption key={option} value={option} label={option} />
                  ))}
                </FormSelect>
              </FormGroup>

              <FormGroup
                label="Nodes"
                fieldId={`launch-cluster-nodes-${nodeSet.id}`}
                isRequired
              >
                <TextInput
                  id={`launch-cluster-nodes-${nodeSet.id}`}
                  type="number"
                  min={1}
                  value={String(nodeSet.nodeCount)}
                  onChange={(_event, value) => {
                    const parsed = Number.parseInt(value, 10)
                    setForm((current) => ({
                      ...current,
                      nodeSets: current.nodeSets.map((entry) =>
                        entry.id === nodeSet.id
                          ? {
                              ...entry,
                              nodeCount: Number.isNaN(parsed) ? 1 : Math.max(1, parsed),
                            }
                          : entry,
                      ),
                    }))
                  }}
                />
              </FormGroup>
            </div>
          ))}

          <Button
            variant="link"
            isInline
            icon={<PlusCircleIcon />}
            className="tenant-user-launch-wizard__add-node-set"
            onClick={() =>
              setForm((current) => ({
                ...current,
                nodeSets: [
                  ...current.nodeSets,
                  createDefaultClusterNodeSet(current.nodeSets.length + 1),
                ],
              }))
            }
          >
            {CLUSTER_LAUNCH_INSTANCE_DEMO.addNodeSetLabel}
          </Button>
        </div>
      </Form>
    </div>
  )

  const renderClusterNetworkingStep = () => (
    <div className="tenant-user-launch-wizard__step">
      <Form autoComplete="off" className="tenant-user-launch-wizard__form">
        <FormGroup label="Pod CIDR" fieldId="launch-cluster-pod-cidr">
          <TextInput
            id="launch-cluster-pod-cidr"
            value={form.podCidr}
            onChange={(_event, value) => setForm((current) => ({ ...current, podCidr: value }))}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{CLUSTER_LAUNCH_INSTANCE_DEMO.podCidrHelper}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <FormGroup label="Service CIDR" fieldId="launch-cluster-service-cidr">
          <TextInput
            id="launch-cluster-service-cidr"
            value={form.serviceCidr}
            onChange={(_event, value) => setForm((current) => ({ ...current, serviceCidr: value }))}
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>{CLUSTER_LAUNCH_INSTANCE_DEMO.serviceCidrHelper}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </Form>
    </div>
  )

  const renderConfigureStep = () => (
    <div className="tenant-user-launch-wizard__step">
      <Content component="h2" className="tenant-user-launch-wizard__step-title">
        {LAUNCH_INSTANCE_WIZARD_DEMO.configureTitle}
      </Content>
      <Content component="p" className="tenant-user-launch-wizard__step-lede">
        {LAUNCH_INSTANCE_WIZARD_DEMO.configureLede}
      </Content>

      <Form autoComplete="off" className="tenant-user-launch-wizard__form">
        <FormGroup label="Instance name" fieldId="launch-instance-name" isRequired>
          <TextInput
            id="launch-instance-name"
            value={form.instanceName}
            onChange={(_event, value) => setForm((current) => ({ ...current, instanceName: value }))}
            placeholder={getLaunchInstanceNamePlaceholder(catalogItem.serviceId)}
          />
        </FormGroup>

        <FormGroup label="SSH public key" fieldId="launch-instance-ssh-key" isRequired>
          <TextArea
            id="launch-instance-ssh-key"
            value={form.sshPublicKey}
            onChange={(_event, value) => setForm((current) => ({ ...current, sshPublicKey: value }))}
            placeholder={LAUNCH_INSTANCE_WIZARD_DEMO.sshPlaceholder}
            resizeOrientation="vertical"
          />
        </FormGroup>

        <div className="tenant-user-launch-wizard__preconfigured-section">
          <div className="tenant-user-launch-wizard__preconfigured-title">
            <LockIcon aria-hidden />
            <span>{LAUNCH_INSTANCE_WIZARD_DEMO.preConfiguredTitle}</span>
          </div>

          <div
            className={`tenant-user-launch-wizard__preconfigured-grid${
              networkContext.enabled && !includeNetworkingStep
                ? ' tenant-user-launch-wizard__preconfigured-grid--with-network'
                : ''
            }`}
          >
            {isServiceAwareCatalogItem ? (
              catalogDetailSpecRows.slice(0, 4).map((row) => (
                <div key={row.label} className="tenant-user-launch-wizard__preconfigured-item">
                  <Content component="p" className="tenant-user-launch-wizard__preconfigured-label">
                    {row.label}
                  </Content>
                  <Content component="p" className="tenant-user-launch-wizard__preconfigured-value">
                    {row.value}
                  </Content>
                </div>
              ))
            ) : (
              <>
                <div className="tenant-user-launch-wizard__preconfigured-item">
                  <Content component="p" className="tenant-user-launch-wizard__preconfigured-label">
                    Hardware profile
                  </Content>
                  <Content component="p" className="tenant-user-launch-wizard__preconfigured-value">
                    {catalogItem.hardwareProfile}
                  </Content>
                </div>
                <div className="tenant-user-launch-wizard__preconfigured-item">
                  <Content component="p" className="tenant-user-launch-wizard__preconfigured-label">
                    OS image
                  </Content>
                  <Content component="p" className="tenant-user-launch-wizard__preconfigured-value">
                    {catalogItem.osImage}
                  </Content>
                </div>
              </>
            )}
            {networkContext.enabled && !includeNetworkingStep ? (
              <div className="tenant-user-launch-wizard__preconfigured-item">
                <Content component="p" className="tenant-user-launch-wizard__preconfigured-label">
                  Network
                </Content>
                <Content component="p" className="tenant-user-launch-wizard__preconfigured-value">
                  {assignedNetworkSummary}
                </Content>
                <Content component="p" className="tenant-user-launch-wizard__assigned-helper">
                  {LAUNCH_INSTANCE_WIZARD_DEMO.networkingAssignedHelper}
                </Content>
              </div>
            ) : null}
          </div>
        </div>
      </Form>
    </div>
  )

  const renderNetworkingStep = () => {
    const assignedFields = networkContext.fields.filter((field) => field.locked)
    const editableFields = networkContext.fields.filter((field) => !field.locked)

    return (
      <div className="tenant-user-launch-wizard__step">
        <Content component="h2" className="tenant-user-launch-wizard__step-title">
          {LAUNCH_INSTANCE_WIZARD_DEMO.networkingTitle}
        </Content>
        <Content component="p" className="tenant-user-launch-wizard__step-lede">
          {LAUNCH_INSTANCE_WIZARD_DEMO.networkingLede}
        </Content>

        {assignedFields.length > 0 ? (
          <div className="tenant-user-launch-wizard__assigned-grid">
            {assignedFields.map((field) => (
              <AssignedNetworkField key={field.kind} field={field} />
            ))}
          </div>
        ) : null}

        <Form autoComplete="off" className="tenant-user-launch-wizard__form">
          {editableFields.map((field) => {
            const fieldId = `launch-instance-${field.kind}`
            const selectedId = getSelectedIdForField(field)

            return (
              <FormGroup key={field.kind} label={field.label} fieldId={fieldId} isRequired>
                <FormSelect
                  id={fieldId}
                  value={selectedId}
                  onChange={(_event, value) => updateNetworkSelection(field.kind, value)}
                  aria-label={field.label}
                >
                  {field.options.map((option) => (
                    <FormSelectOption
                      key={option.id}
                      value={option.id}
                      label={getCatalogOptionLabel(option.name, option.detail)}
                    />
                  ))}
                </FormSelect>
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Choose the {field.label.toLowerCase()} for this instance.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            )
          })}
        </Form>
      </div>
    )
  }

  const renderReviewStep = () => {
    const reviewInstanceName =
      isVmCatalogItem || isBareMetalCatalogItem || isClusterCatalogItem
        ? formatTenantInstanceName(form.instanceName.trim())
        : form.instanceName.trim()

    const virtualNetworkLabel =
      getCatalogVirtualNetworkOptions().find(
        (option) => option.id === networkSelections.virtualNetworkId,
      )?.name ?? networking.virtualNetwork
    const subnetLabel =
      getCatalogSubnetOptions(networkSelections.virtualNetworkId).find(
        (option) => option.id === networkSelections.subnetId,
      )?.name ?? networking.subnet
    const securityGroupReviewLabel =
      getCatalogSecurityGroupOptions().find(
        (option) => option.id === networkSelections.securityGroupId,
      )?.name ?? securityGroupLabel

    return (
      <div className="tenant-user-launch-wizard__step">
        <Content component="h2" className="tenant-user-launch-wizard__step-title">
          {LAUNCH_INSTANCE_WIZARD_DEMO.reviewTitle}
        </Content>

        <Alert
          variant="info"
          isInline
          title="Provisioning time"
          className="tenant-user-launch-wizard__review-alert"
          customIcon={<InfoCircleIcon />}
        >
          <Content component="p" className="tenant-user-launch-wizard__review-alert-text">
            {LAUNCH_INSTANCE_WIZARD_DEMO.reviewProvisioningNote}
          </Content>
        </Alert>

        <DescriptionList isCompact className="tenant-user-launch-wizard__review-list">
          <DescriptionListGroup>
            <DescriptionListTerm>Catalog item</DescriptionListTerm>
            <DescriptionListDescription>{catalogItem.displayName}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Instance name</DescriptionListTerm>
            <DescriptionListDescription>{reviewInstanceName}</DescriptionListDescription>
          </DescriptionListGroup>
          {isBareMetalCatalogItem ? (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>Hardware</DescriptionListTerm>
                <DescriptionListDescription>{catalogItem.hardwareProfile}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>GPU</DescriptionListTerm>
                <DescriptionListDescription>{catalogItem.gpu}</DescriptionListDescription>
              </DescriptionListGroup>
              {form.cloudInitUserData.trim() ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>User data</DescriptionListTerm>
                  <DescriptionListDescription>
                    {form.cloudInitUserData.trim()}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}
            </>
          ) : isVmCatalogItem ? (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>Container disk image</DescriptionListTerm>
                <DescriptionListDescription>
                  {form.containerDiskImage.trim()}
                </DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Instance type</DescriptionListTerm>
                <DescriptionListDescription>{form.instanceType.trim()}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Boot disk size</DescriptionListTerm>
                <DescriptionListDescription>
                  {form.bootDiskSizeGiB} GiB
                </DescriptionListDescription>
              </DescriptionListGroup>
              {form.cloudInitUserData.trim() ? (
                <DescriptionListGroup>
                  <DescriptionListTerm>Cloud-init user data</DescriptionListTerm>
                  <DescriptionListDescription>
                    {form.cloudInitUserData.trim()}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ) : null}
              <DescriptionListGroup>
                <DescriptionListTerm>Virtual network</DescriptionListTerm>
                <DescriptionListDescription>{virtualNetworkLabel}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Subnet</DescriptionListTerm>
                <DescriptionListDescription>{subnetLabel}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Security groups</DescriptionListTerm>
                <DescriptionListDescription>
                  {securityGroupReviewLabel}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </>
          ) : isClusterCatalogItem ? (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>Release image</DescriptionListTerm>
                <DescriptionListDescription>{form.releaseImage.trim()}</DescriptionListDescription>
              </DescriptionListGroup>
              {form.nodeSets.map((nodeSet, index) => (
                <DescriptionListGroup key={nodeSet.id}>
                  <DescriptionListTerm>Node set {index + 1}</DescriptionListTerm>
                  <DescriptionListDescription>
                    {nodeSet.hostType} · {nodeSet.nodeCount}{' '}
                    {nodeSet.nodeCount === 1 ? 'node' : 'nodes'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ))}
              <DescriptionListGroup>
                <DescriptionListTerm>Pod CIDR</DescriptionListTerm>
                <DescriptionListDescription>{form.podCidr.trim()}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Service CIDR</DescriptionListTerm>
                <DescriptionListDescription>{form.serviceCidr.trim()}</DescriptionListDescription>
              </DescriptionListGroup>
            </>
          ) : (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>Hardware</DescriptionListTerm>
                <DescriptionListDescription>{catalogItem.hardwareProfile}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>GPU</DescriptionListTerm>
                <DescriptionListDescription>{catalogItem.gpu}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>OS image</DescriptionListTerm>
                <DescriptionListDescription>{catalogItem.osImage}</DescriptionListDescription>
              </DescriptionListGroup>
            </>
          )}
          {!isVmCatalogItem &&
          !isClusterCatalogItem &&
          !isBareMetalCatalogItem &&
          networkContext.enabled ? (
            <>
              <DescriptionListGroup>
                <DescriptionListTerm>Network</DescriptionListTerm>
                <DescriptionListDescription>{assignedNetworkSummary}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Security group</DescriptionListTerm>
                <DescriptionListDescription>{securityGroupLabel}</DescriptionListDescription>
              </DescriptionListGroup>
            </>
          ) : null}
          {!isBareMetalCatalogItem ? (
            <DescriptionListGroup>
              <DescriptionListTerm>{scopeFieldLabel}</DescriptionListTerm>
              <DescriptionListDescription>{scopeLabel}</DescriptionListDescription>
            </DescriptionListGroup>
          ) : null}
        </DescriptionList>
      </div>
    )
  }

  const renderProvisioningStep = () => (
    <div className="tenant-user-launch-wizard__step tenant-user-launch-wizard__step--provisioning">
      <Content component="h2" className="tenant-user-launch-wizard__step-title">
        {LAUNCH_INSTANCE_WIZARD_DEMO.provisioningTitle}
      </Content>
      <Content component="p" className="tenant-user-launch-wizard__step-lede">
        {LAUNCH_INSTANCE_WIZARD_DEMO.provisioningLede}
      </Content>

      <Alert
        variant="info"
        isInline
        title="You can close this wizard anytime"
        className="tenant-user-launch-wizard__provisioning-alert"
        customIcon={<InfoCircleIcon />}
      >
        <Content component="p">
          Provisioning will continue in the background—check status under{' '}
          {isClusterCatalogItem
            ? 'Clusters'
            : isVmCatalogItem
              ? 'Virtual machines'
              : isBareMetalCatalogItem
                ? 'Bare metal'
                : catalogItem.serviceId === 'models'
                  ? 'Models'
                  : 'Services'}
          .
        </Content>
      </Alert>

      <Card className="tenant-user-launch-wizard__boot-log">
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          className="tenant-user-launch-wizard__boot-log-header"
        >
          <FlexItem>
            <Content component="p" className="tenant-user-launch-wizard__boot-log-title">
              Boot log ·{' '}
              {isVmCatalogItem || isBareMetalCatalogItem || isClusterCatalogItem
                ? formatTenantInstanceName(form.instanceName.trim())
                : form.instanceName.trim()}
            </Content>
          </FlexItem>
          <FlexItem>
            <Content component="p" className="tenant-user-launch-wizard__boot-log-remaining">
              {LAUNCH_INSTANCE_WIZARD_DEMO.bootLogRemaining}
            </Content>
          </FlexItem>
        </Flex>

        <ul className="tenant-user-launch-wizard__boot-log-list">
          {PROVISIONING_BOOT_LOG_STEPS.map((step, index) => {
            const status = getBootLogStatus(index, activeBootLogIndex)

            return (
              <li
                key={step.id}
                className={`tenant-user-launch-wizard__boot-log-item tenant-user-launch-wizard__boot-log-item--${status}`}
              >
                {status === 'completed' ? (
                  <CheckIcon aria-hidden />
                ) : status === 'in-progress' ? (
                  <Spinner
                    size="sm"
                    className="tenant-user-launch-wizard__boot-log-spinner"
                    aria-label="Step in progress"
                  />
                ) : (
                  <span className="tenant-user-launch-wizard__boot-log-bullet" aria-hidden />
                )}
                <span>{step.label}</span>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )

  const renderStepContent = (stepId: LaunchInstanceWizardStepId) => {
    if (isClusterCatalogItem) {
      switch (stepId) {
        case 'general':
          return renderGeneralStep()
        case 'configure':
          return renderClusterConfigureStep()
        case 'networking':
          return renderClusterNetworkingStep()
        case 'review':
          return renderReviewStep()
        case 'provisioning':
          return renderProvisioningStep()
        default:
          return null
      }
    }

    if (isVmCatalogItem) {
      switch (stepId) {
        case 'general':
          return renderGeneralStep()
        case 'configure':
          return renderVmConfigureStep()
        case 'networking':
          return renderVmNetworkingStep()
        case 'review':
          return renderReviewStep()
        case 'provisioning':
          return renderProvisioningStep()
        default:
          return null
      }
    }

    if (isBareMetalCatalogItem) {
      switch (stepId) {
        case 'general':
          return renderGeneralStep()
        case 'configure':
          return renderBareMetalConfigureStep()
        case 'review':
          return renderReviewStep()
        case 'provisioning':
          return renderProvisioningStep()
        default:
          return null
      }
    }

    switch (stepId) {
      case 'configure':
        return renderConfigureStep()
      case 'networking':
        return renderNetworkingStep()
      case 'review':
        return renderReviewStep()
      case 'provisioning':
        return renderProvisioningStep()
      default:
        return null
    }
  }

  const clusterStepFooter = (stepId: LaunchInstanceWizardStepId) => {
    if (
      stepId === 'general' ||
      stepId === 'configure' ||
      stepId === 'networking' ||
      stepId === 'review'
    ) {
      const isNextDisabled =
        stepId === 'general'
          ? !isClusterGeneralStepValid(form)
          : stepId === 'configure'
            ? !isClusterConfigureStepValid(form)
            : stepId === 'networking'
              ? !isClusterNetworkingStepValid(form)
              : false

      return {
        isNextDisabled,
        nextButtonText:
          stepId === 'review' ? LAUNCH_INSTANCE_WIZARD_DEMO.confirmProvisioningLabel : 'Next',
        backButtonText: 'Back',
        ...(stepId === 'general' ? { isBackDisabled: true } : {}),
        ...(stepId === 'review' ? { isCancelHidden: true } : {}),
      }
    }

    return {
      isCancelHidden: false,
      cancelButtonText: LAUNCH_INSTANCE_WIZARD_DEMO.closeWhileProvisioningLabel,
      isBackHidden: true,
      isNextDisabled: true,
      nextButtonText: isProvisioningComplete ? 'Complete' : 'Provisioning…',
      onClose: handleClose,
    }
  }

  const vmStepFooter = (stepId: LaunchInstanceWizardStepId) => {
    if (
      stepId === 'general' ||
      stepId === 'configure' ||
      stepId === 'networking' ||
      stepId === 'review'
    ) {
      const isNextDisabled =
        stepId === 'general'
          ? !isVmGeneralStepValid(form)
          : stepId === 'configure'
            ? !isVmConfigureStepValid(form)
            : stepId === 'networking'
              ? !isVmNetworkingStepValid(form)
              : false

      return {
        isNextDisabled,
        nextButtonText:
          stepId === 'review' ? LAUNCH_INSTANCE_WIZARD_DEMO.confirmProvisioningLabel : 'Next',
        backButtonText: 'Back',
        ...(stepId === 'general' ? { isBackDisabled: true } : {}),
        ...(stepId === 'review' ? { isCancelHidden: true } : {}),
      }
    }

    return {
      isCancelHidden: false,
      cancelButtonText: LAUNCH_INSTANCE_WIZARD_DEMO.closeWhileProvisioningLabel,
      isBackHidden: true,
      isNextDisabled: true,
      nextButtonText: isProvisioningComplete ? 'Complete' : 'Provisioning…',
      onClose: handleClose,
    }
  }

  const bareMetalStepFooter = (stepId: LaunchInstanceWizardStepId) => {
    if (stepId === 'general' || stepId === 'configure' || stepId === 'review') {
      return {
        isNextDisabled: stepId === 'general' ? !isBareMetalGeneralStepValid(form) : false,
        nextButtonText:
          stepId === 'review' ? LAUNCH_INSTANCE_WIZARD_DEMO.confirmProvisioningLabel : 'Next',
        backButtonText: 'Back',
        ...(stepId === 'general' ? { isBackDisabled: true } : {}),
        ...(stepId === 'review' ? { isCancelHidden: true } : {}),
      }
    }

    return {
      isCancelHidden: false,
      cancelButtonText: LAUNCH_INSTANCE_WIZARD_DEMO.closeWhileProvisioningLabel,
      isBackHidden: true,
      isNextDisabled: true,
      nextButtonText: isProvisioningComplete ? 'Complete' : 'Provisioning…',
      onClose: handleClose,
    }
  }

  const getStepFooter = (stepId: LaunchInstanceWizardStepId) => {
    if (isClusterCatalogItem) {
      return clusterStepFooter(stepId)
    }

    if (isVmCatalogItem) {
      return vmStepFooter(stepId)
    }

    if (isBareMetalCatalogItem) {
      return bareMetalStepFooter(stepId)
    }

    if (stepId === 'configure' || stepId === 'networking') {
      return {
        isNextDisabled:
          stepId === 'configure'
            ? !isInstanceNameValid(form.instanceName) || !form.sshPublicKey.trim()
            : false,
        nextButtonText: (
          <span className="tenant-user-launch-wizard__footer-label">
            <span>Continue</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
        ...(stepId === 'networking'
          ? {
              backButtonText: (
                <span className="tenant-user-launch-wizard__footer-label">
                  <ArrowLeftIcon aria-hidden />
                  <span>Back</span>
                </span>
              ),
            }
          : {}),
      }
    }

    if (stepId === 'review') {
      return {
        isCancelHidden: true,
        backButtonText: (
          <span className="tenant-user-launch-wizard__footer-label">
            <ArrowLeftIcon aria-hidden />
            <span>Back</span>
          </span>
        ),
        nextButtonText: (
          <span className="tenant-user-launch-wizard__footer-label">
            <span>{LAUNCH_INSTANCE_WIZARD_DEMO.confirmProvisioningLabel}</span>
            <ArrowRightIcon aria-hidden />
          </span>
        ),
      }
    }

    return {
      isCancelHidden: false,
      cancelButtonText: LAUNCH_INSTANCE_WIZARD_DEMO.closeWhileProvisioningLabel,
      isBackHidden: true,
      isNextDisabled: true,
      nextButtonText: isProvisioningComplete ? 'Complete' : 'Provisioning…',
      onClose: handleClose,
    }
  }

  return (
    <Modal
      variant={ModalVariant.medium}
      width="64rem"
      maxWidth="64rem"
      isOpen={isOpen}
      onEscapePress={handleClose}
      aria-labelledby="launch-instance-wizard-title"
      className="tenant-user-launch-wizard__modal"
    >
      {isOpen ? (
        <Wizard
          key={`launch-instance-wizard-${catalogItem.serviceId}-${includeNetworkingStep ? 'net' : 'no-net'}`}
          className="tenant-user-launch-wizard"
          height="40rem"
          onClose={handleClose}
          onStepChange={(_event, currentStep) => {
            const stepId = String(currentStep.id).replace('launch-instance-step-', '')
            if (
              stepId === 'general' ||
              stepId === 'configure' ||
              stepId === 'networking' ||
              stepId === 'review' ||
              stepId === 'provisioning'
            ) {
              setActiveStepId(stepId)
            }
          }}
          header={
            <WizardHeader
              title={
                isClusterCatalogItem
                  ? 'Launch instance for cluster'
                  : isVmCatalogItem
                    ? 'Launch instance for virtual machine'
                    : isBareMetalCatalogItem
                      ? 'Launch instance for bare metal'
                      : catalogItem.serviceId === 'models'
                        ? 'Launch instance for model'
                        : 'Launch instance'
              }
              titleId="launch-instance-wizard-title"
              description={activeStepDescription || undefined}
              onClose={handleClose}
              closeButtonAriaLabel="Close launch instance wizard"
            />
          }
        >
          {wizardSteps.map((step) => (
            <WizardStep
              key={step.id}
              name={step.label}
              id={`launch-instance-step-${step.id}`}
              footer={getStepFooter(step.id)}
            >
              {renderStepContent(step.id)}
            </WizardStep>
          ))}
        </Wizard>
      ) : null}
    </Modal>
  )
}

function getCatalogOptionLabel(name: string, detail: string): string {
  return `${name} · ${detail}`
}
