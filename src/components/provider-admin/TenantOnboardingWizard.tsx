import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useHref } from 'react-router-dom'
import { ExclamationTriangleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-triangle-icon'
import { InfoCircleIcon } from '@patternfly/react-icons/dist/esm/icons/info-circle-icon'
import { RedoIcon } from '@patternfly/react-icons/dist/esm/icons/redo-icon'
import {
  Alert,
  Button,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  Modal,
  ModalVariant,
  Spinner,
  TextInput,
  Title,
  Wizard,
  WizardFooter,
  WizardHeader,
  WizardStep,
  useWizardContext,
} from '@patternfly/react-core'
import { RouterButton } from '../RouterButton'
import { ExternalLinkButton } from '../shared/ExternalLinkButton'
import type { ProviderCatalogDraft } from '../../providerSetup/storage'
import {
  BLUESOLACE_ONBOARDING_M360_ACCOUNT_NAME,
  DEFAULT_ONBOARDING_M360_ACCOUNT_NAME,
  fetchM360BillingAccounts,
  findM360AccountByReference,
  findM360AccountByTenantName,
  formatM360PortalValue,
  buildM360AccountDetailPath,
  getM360AccountLinkConflictMessage,
  getM360AccountTenantName,
  isM360AccountLinkedToAnotherTenant,
  isM360BillingAccountInactive,
  linkM360AccountInDemoStore,
  mergeResumedM360BillingAccounts,
  resolveM360AccountRateCard,
  type M360BillingAccount,
} from '../../billing/m360Accounts'
import { resolveM360ConnectionStatus } from '../../billing/m360'
import { KubernetesResourceNameField } from '../shared/KubernetesResourceNameHelper'
import { ResourceCreatePageShell } from '../shared/ResourceCreatePageShell'
import { useWizardLeaveConfirm } from '../shared/useWizardLeaveConfirm'
import { getAssignableExternalIpPools } from '../../providerAdmin/externalIpPools'
import {
  getProviderExternalIpPools,
  getProviderRegisteredOrganizations,
} from '../../providerSetup/storage'
import {
  buildNextRegisterOrganizationForm,
  areAdditionalDomainsValid,
  buildRegisterBreakGlassFields,
  formFromRegisteredOrganization,
  generateOrganizationId,
  getTakenEmailDomains,
  isOrganizationDomainTaken,
  isOrganizationNameTaken,
  isOrganizationSlugTaken,
  isValidPrimaryDomain,
  normalizeAdditionalDomains,
  normalizePrimaryDomain,
  slugifyOrganizationName,
  TENANT_ONBOARDING_STEPS,
  type RegisterOrganizationForm,
  type RegisteredOrganization,
  type TenantOnboardingStepId,
} from '../../providerAdmin/organizations'
import {
  AdditionalEmailDomainsField,
  AdditionalEmailDomainsValue,
} from './AdditionalEmailDomainsField'
import { CatalogEditChangesSummary } from './CatalogEditChangesSummary'
import { TenantCompanyLogoField } from './TenantCompanyLogoField'
import {
  buildOrganizationEditSnapshot,
  buildOrganizationEditSnapshotFromOrganization,
  getOrganizationEditChanges,
  getOrganizationEditModifiedStepIds,
} from '../../providerAdmin/organizationEditDiff'
import {
  getKubernetesResourceNameValidation,
  isValidKubernetesResourceName,
} from '../../shared/kubernetesResourceName'

type TenantOnboardingWizardProps = {
  isOpen: boolean
  /** `page` replaces the Tenants list. Use `modal` when stacked over another flow (e.g. catalog create). */
  presentation?: 'modal' | 'page'
  catalogDraft: ProviderCatalogDraft | null
  /** Resume billing setup for an existing tenant (starts on Billing; General is read-only). */
  resumeOrganization?: RegisteredOrganization | null
  /** Full edit of an existing tenant (General → Billing → Review). */
  editingOrganization?: RegisteredOrganization | null
  /** Which step to open on. Defaults to General; Billing pending uses `billing_account`. */
  initialStepId?: TenantOnboardingStepId
  onClose: () => void
  onPersistOrganization: (organization: RegisteredOrganization) => void
  onComplete?: (organization: RegisteredOrganization) => void
}

type BillingApiState = 'idle' | 'loading' | 'ready' | 'error'

const M360_ACCOUNTS_PATH = '/m360/accounts'

function buildTenantOnboardingForm(
  existingOrganizations: RegisteredOrganization[],
): RegisterOrganizationForm {
  return {
    ...buildNextRegisterOrganizationForm(existingOrganizations),
    additionalDomains: [],
  }
}

type TenantOnboardingNavigateFooterProps = {
  onClose: () => void
  isNextDisabled?: boolean
  nextButtonText?: ReactNode
  onNavigateNext: () => boolean | Promise<boolean>
}

function TenantOnboardingNavigateFooter({
  onClose,
  isNextDisabled = false,
  nextButtonText,
  onNavigateNext,
}: TenantOnboardingNavigateFooterProps) {
  const { goToNextStep, goToPrevStep, activeStep } = useWizardContext()

  const handleNext = async () => {
    const shouldAdvance = await onNavigateNext()
    if (shouldAdvance) {
      goToNextStep()
    }
  }

  if (!activeStep) {
    return null
  }

  return (
    <WizardFooter
      activeStep={activeStep}
      onBack={goToPrevStep}
      onClose={onClose}
      isBackDisabled={activeStep.index === 1}
      isNextDisabled={isNextDisabled}
      nextButtonText={nextButtonText}
      onNext={handleNext}
    />
  )
}

export function TenantOnboardingWizard({
  isOpen,
  presentation = 'page',
  catalogDraft,
  resumeOrganization = null,
  editingOrganization = null,
  initialStepId = 'general',
  onClose,
  onPersistOrganization,
  onComplete,
}: TenantOnboardingWizardProps) {
  const isPage = presentation === 'page'
  const sourceOrganization = editingOrganization ?? resumeOrganization
  const isEditMode = Boolean(editingOrganization)
  const isResumeBillingMode = Boolean(resumeOrganization) && !editingOrganization
  const isExistingTenantMode = Boolean(sourceOrganization)
  const wizardTitle = isExistingTenantMode ? 'Edit tenant' : 'Register tenant'
  const wizardStartIndex = (() => {
    if (isResumeBillingMode) {
      return 2
    }
    const stepIndex = TENANT_ONBOARDING_STEPS.findIndex((step) => step.id === initialStepId)
    return stepIndex >= 0 ? stepIndex + 1 : 1
  })()
  const m360AccountsHref = useHref(M360_ACCOUNTS_PATH)
  const [form, setForm] = useState<RegisterOrganizationForm>(() =>
    buildTenantOnboardingForm(getProviderRegisteredOrganizations()),
  )
  const [createdOrganization, setCreatedOrganization] = useState<RegisteredOrganization | null>(
    null,
  )
  const [billingAccounts, setBillingAccounts] = useState<M360BillingAccount[]>([])
  const [billingApiState, setBillingApiState] = useState<BillingApiState>('idle')
  const [selectedAccountName, setSelectedAccountName] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [isLinking, setIsLinking] = useState(false)

  const existingOrganizations = useMemo(
    () => (isOpen ? getProviderRegisteredOrganizations() : []),
    [isOpen],
  )

  const excludeOrganizationId = sourceOrganization?.id
  const nameTaken = isOrganizationNameTaken(
    form.organizationName,
    existingOrganizations,
    excludeOrganizationId,
  )
  const domainTaken = isOrganizationDomainTaken(
    form.primaryDomain,
    existingOrganizations,
    excludeOrganizationId,
  )
  const slugTaken = isOrganizationSlugTaken(
    form.organizationName,
    existingOrganizations,
    excludeOrganizationId,
  )
  const nameFormat = getKubernetesResourceNameValidation(form.organizationName)
  const takenEmailDomains = useMemo(
    () => getTakenEmailDomains(existingOrganizations, excludeOrganizationId),
    [existingOrganizations, excludeOrganizationId],
  )
  const additionalDomainsValid = areAdditionalDomainsValid(
    form.additionalDomains,
    form.primaryDomain,
    takenEmailDomains,
  )
  const isGeneralStepValid =
    isValidKubernetesResourceName(form.organizationName) &&
    isValidPrimaryDomain(form.primaryDomain) &&
    additionalDomainsValid &&
    !nameTaken &&
    !domainTaken &&
    !slugTaken

  const editBaseline = useMemo(() => {
    if (!isEditMode || !editingOrganization) {
      return null
    }

    return buildOrganizationEditSnapshotFromOrganization(editingOrganization)
  }, [editingOrganization, isEditMode])

  const currentEditSnapshot = useMemo(() => {
    if (!isEditMode) {
      return null
    }

    return buildOrganizationEditSnapshot(form, { m360AccountId: selectedAccountName })
  }, [form, isEditMode, selectedAccountName])

  const editChanges = useMemo(() => {
    if (!editBaseline || !currentEditSnapshot) {
      return []
    }

    return getOrganizationEditChanges(editBaseline, currentEditSnapshot)
  }, [currentEditSnapshot, editBaseline])

  const modifiedStepIds = useMemo(
    () => getOrganizationEditModifiedStepIds(editChanges),
    [editChanges],
  )

  const canSaveOrganizationEdit = !isEditMode || editChanges.length > 0

  const draftTenantName =
    createdOrganization?.name.trim() ||
    sourceOrganization?.name.trim() ||
    form.organizationName.trim()

  const matchedExternalAccount = useMemo(() => {
    if (!draftTenantName || billingAccounts.length === 0) {
      return null
    }
    return findM360AccountByTenantName(draftTenantName, billingAccounts)
  }, [billingAccounts, draftTenantName])

  const selectedAccount = selectedAccountName
    ? findM360AccountByReference(selectedAccountName)
    : null
  const selectedAccountInactive = isM360BillingAccountInactive(selectedAccount)
  const draftOrganizationSlug = slugifyOrganizationName(form.organizationName)
  const accountConflict =
    selectedAccount &&
    (createdOrganization?.slug || sourceOrganization?.slug || draftOrganizationSlug)
      ? isM360AccountLinkedToAnotherTenant(
          selectedAccount,
          createdOrganization?.slug || sourceOrganization?.slug || draftOrganizationSlug,
        )
      : false

  const sortedBillingAccounts = useMemo(() => {
    const currentTenantSlug =
      createdOrganization?.slug || sourceOrganization?.slug || draftOrganizationSlug

    return [...billingAccounts].sort((left, right) => {
      const leftLinkedElsewhere = isM360AccountLinkedToAnotherTenant(left, currentTenantSlug)
      const rightLinkedElsewhere = isM360AccountLinkedToAnotherTenant(right, currentTenantSlug)

      if (leftLinkedElsewhere !== rightLinkedElsewhere) {
        return leftLinkedElsewhere ? 1 : -1
      }

      return getM360AccountTenantName(left).localeCompare(getM360AccountTenantName(right), undefined, {
        sensitivity: 'base',
      })
    })
  }, [
    billingAccounts,
    createdOrganization?.slug,
    draftOrganizationSlug,
    sourceOrganization?.slug,
  ])

  const getDefaultBillingSelections = (organization: RegisteredOrganization | null) => {
    const isBluesolaceResume =
      organization?.slug === 'bluesolace' || organization?.slug === 'evergreen'

    return {
      accountName: isBluesolaceResume
        ? BLUESOLACE_ONBOARDING_M360_ACCOUNT_NAME
        : DEFAULT_ONBOARDING_M360_ACCOUNT_NAME,
    }
  }

  const resetWizard = () => {
    setForm(buildTenantOnboardingForm(getProviderRegisteredOrganizations()))
    setCreatedOrganization(null)
    setBillingAccounts([])
    setBillingApiState('idle')
    setSelectedAccountName('')
    setLinkError(null)
    setIsLinking(false)
  }

  const handleClose = () => {
    resetWizard()
    onClose()
  }

  const { requestClose, leaveConfirmModal, wrapStepFooter } = useWizardLeaveConfirm({
    onLeave: handleClose,
    primaryActionLabel: 'Leave',
    titleId: 'tenant-onboarding-leave-confirm',
  })

  useEffect(() => {
    if (!isOpen) {
      resetWizard()
      return
    }

    if (sourceOrganization) {
      const linkedReference =
        sourceOrganization.m360AccountId?.trim() ||
        sourceOrganization.billingAccountId.trim()
      const resumedAccount = linkedReference
        ? findM360AccountByReference(linkedReference)
        : null
      const billingDefaults = getDefaultBillingSelections(sourceOrganization)
      setForm(formFromRegisteredOrganization(sourceOrganization))
      setCreatedOrganization(sourceOrganization)
      setSelectedAccountName(
        resumedAccount
          ? getM360AccountTenantName(resumedAccount)
          : isEditMode
            ? ''
            : billingDefaults.accountName,
      )
      setBillingApiState('idle')
      return
    }

    setForm(buildTenantOnboardingForm(getProviderRegisteredOrganizations()))
    setSelectedAccountName(DEFAULT_ONBOARDING_M360_ACCOUNT_NAME)
  }, [editingOrganization, isOpen, resumeOrganization])

  useEffect(() => {
    if (!isOpen || billingApiState !== 'idle') {
      return
    }

    setBillingApiState('loading')
    fetchM360BillingAccounts()
      .then((accounts) => {
        const organization = createdOrganization ?? sourceOrganization
        const mergedAccounts = mergeResumedM360BillingAccounts(accounts, organization)
        setBillingAccounts(mergedAccounts)
        setBillingApiState('ready')
        const match = draftTenantName
          ? findM360AccountByTenantName(draftTenantName, mergedAccounts)
          : null
        const billingDefaults = getDefaultBillingSelections(organization)
        const hasLinkedBilling = Boolean(
          organization?.m360AccountId?.trim() || organization?.billingAccountId.trim(),
        )
        if (match && (hasLinkedBilling || !isEditMode)) {
          setSelectedAccountName(getM360AccountTenantName(match))
        } else {
          setSelectedAccountName((current) =>
            current || (isEditMode ? '' : billingDefaults.accountName),
          )
        }
      })
      .catch(() => {
        setBillingApiState('error')
      })
  }, [billingApiState, createdOrganization, draftTenantName, isEditMode, isOpen, sourceOrganization])

  useEffect(() => {
    if (!matchedExternalAccount || billingApiState !== 'ready' || isEditMode) {
      return
    }

    const matchName = getM360AccountTenantName(matchedExternalAccount)
    setSelectedAccountName((current) => {
      if (!current || current === DEFAULT_ONBOARDING_M360_ACCOUNT_NAME) {
        return matchName
      }
      return current
    })
  }, [billingApiState, isEditMode, matchedExternalAccount])

  const buildOrganizationFromForm = (): RegisteredOrganization | null => {
    if (!isGeneralStepValid) {
      return null
    }

    const slug = slugifyOrganizationName(form.organizationName)
    const normalizedPrimaryDomain = normalizePrimaryDomain(form.primaryDomain)
    const normalizedAdditionalDomains = normalizeAdditionalDomains(
      form.additionalDomains,
      normalizedPrimaryDomain,
    )
    const pools = getAssignableExternalIpPools(getProviderExternalIpPools())
    const selectedPool = pools[0] ?? null
    const breakGlass = buildRegisterBreakGlassFields(
      form.organizationName.trim(),
      normalizedPrimaryDomain,
      {
        breakGlassUsername: form.breakGlassUsername,
        breakGlassPassword: form.breakGlassPassword,
        slug,
      },
    )

    const normalizedTenantName = form.organizationName.trim()
    const organization: RegisteredOrganization = {
      id: generateOrganizationId(),
      name: normalizedTenantName,
      displayName: form.displayName.trim() || normalizedTenantName,
      tenantId: normalizedTenantName,
      slug,
      primaryDomain: normalizedPrimaryDomain,
      additionalDomains: normalizedAdditionalDomains,
      m360AccountId: '',
      m360ConnectionStatus: 'pending',
      billingAccountId: '',
      billingAccountName: form.billingAccountName.trim() || `${slug}-enterprise-billing`,
      billingAccountLinked: false,
      tenantSetupStatus: 'incomplete',
      logoSrc: form.logoSrc.trim() || null,
      logoFileName: form.logoFileName.trim() || null,
      catalogItemId: catalogDraft?.catalogItemId ?? null,
      catalogDisplayName: catalogDraft?.displayName ?? null,
      externalIpPoolId: selectedPool?.id ?? null,
      externalIpPoolName: selectedPool?.name ?? null,
      externalIpPoolCidr: selectedPool?.cidr ?? null,
      maxInstances: 20,
      tenantAdminName: '',
      tenantAdminEmail: '',
      additionalTenantAdmins: [],
      invitedTenantUserEmails: [],
      identityProviderConnected: false,
      identityProviderConnectedBy: null,
      identityProviderName: null,
      identityProviderDisplayName: null,
      identityProviderProtocol: null,
      identityProviderIssuerUrl: null,
      identityProviderClientId: null,
      identityProviders: [],
      idpManagerEmail: null,
      idpInviteToken: null,
      idpInviteStatus: 'none',
      idpInviteSentAt: null,
      idpInviteExpiresAt: null,
      ...breakGlass,
      breakGlassIssuedAt: new Date().toISOString(),
      rbacConfigured: false,
      status: 'Pending activation',
      createdAt: new Date().toISOString(),
    }

    return organization
  }

  const applyGeneralFormToOrganization = (
    organization: RegisteredOrganization,
  ): RegisteredOrganization | null => {
    if (!isGeneralStepValid) {
      return null
    }

    const slug = slugifyOrganizationName(form.organizationName)
    const normalizedPrimaryDomain = normalizePrimaryDomain(form.primaryDomain)
    const normalizedAdditionalDomains = normalizeAdditionalDomains(
      form.additionalDomains,
      normalizedPrimaryDomain,
    )
    const normalizedTenantName = form.organizationName.trim()

    return {
      ...organization,
      name: normalizedTenantName,
      displayName: form.displayName.trim() || normalizedTenantName,
      tenantId: normalizedTenantName,
      slug,
      primaryDomain: normalizedPrimaryDomain,
      additionalDomains: normalizedAdditionalDomains,
      logoSrc: form.logoSrc.trim() || null,
      logoFileName: form.logoFileName.trim() || null,
    }
  }

  const handleCreateTenant = (): boolean => {
    if (isEditMode && editingOrganization) {
      const organization = applyGeneralFormToOrganization(
        createdOrganization ?? editingOrganization,
      )
      if (!organization) {
        return false
      }
      setCreatedOrganization(organization)
      return true
    }

    const organization = buildOrganizationFromForm()
    if (!organization) {
      return false
    }

    setCreatedOrganization(organization)
    return true
  }

  const handleLinkBillingAccount = async (): Promise<RegisteredOrganization | null> => {
    const baseOrganization =
      createdOrganization ?? sourceOrganization ?? buildOrganizationFromForm()
    const organization =
      isEditMode && baseOrganization
        ? applyGeneralFormToOrganization(baseOrganization) ?? baseOrganization
        : baseOrganization
    if (
      !organization ||
      !selectedAccount ||
      accountConflict ||
      isM360BillingAccountInactive(selectedAccount)
    ) {
      return null
    }

    if (!createdOrganization) {
      setCreatedOrganization(organization)
    }

    setIsLinking(true)
    setLinkError(null)
    await new Promise((resolve) => window.setTimeout(resolve, 500))

    if (isM360AccountLinkedToAnotherTenant(selectedAccount, organization.slug)) {
      setLinkError(getM360AccountLinkConflictMessage(selectedAccount))
      setIsLinking(false)
      return null
    }

    const linkedTenantName = getM360AccountTenantName(selectedAccount)
    linkM360AccountInDemoStore(linkedTenantName, organization)
    const detectedRateCard = resolveM360AccountRateCard(selectedAccount)

    const linked: RegisteredOrganization = {
      ...organization,
      m360AccountId: linkedTenantName,
      billingAccountId: linkedTenantName,
      billingAccountName: linkedTenantName,
      m360RateCardId: detectedRateCard?.id,
      m360RateCardName: detectedRateCard?.name,
      m360ConnectionStatus: resolveM360ConnectionStatus(linkedTenantName),
      billingAccountLinked: true,
      tenantSetupStatus: 'ready',
    }

    setCreatedOrganization(linked)
    onPersistOrganization(linked)
    setIsLinking(false)
    return linked
  }

  const retryFetchAccounts = () => {
    setBillingApiState('idle')
  }

  function isStepDisabled(_stepId: TenantOnboardingStepId): boolean {
    return false
  }

  function renderGeneralStep() {
    if (isResumeBillingMode && resumeOrganization) {
      const resumePrimaryDomain = normalizePrimaryDomain(resumeOrganization.primaryDomain)
      const resumeAdditionalDomains = normalizeAdditionalDomains(
        resumeOrganization.additionalDomains ?? [],
        resumePrimaryDomain,
      )

      return (
        <div className="provider-admin-organizations__wizard-step tenant-onboarding__step">
          <Content component="p" className="provider-admin-organizations__wizard-lede">
            Review tenant details.
          </Content>
          <DescriptionList isCompact className="provider-admin-organizations__wizard-review">
            <DescriptionListGroup>
              <DescriptionListTerm>Tenant name</DescriptionListTerm>
              <DescriptionListDescription>{resumeOrganization.name}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Primary email domain</DescriptionListTerm>
              <DescriptionListDescription>{resumePrimaryDomain || '—'}</DescriptionListDescription>
            </DescriptionListGroup>
            {resumeAdditionalDomains.length > 0 ? (
              <DescriptionListGroup>
                <DescriptionListTerm>Additional email domains</DescriptionListTerm>
                <DescriptionListDescription>
                  <AdditionalEmailDomainsValue domains={resumeAdditionalDomains} />
                </DescriptionListDescription>
              </DescriptionListGroup>
            ) : null}
            <DescriptionListGroup>
              <DescriptionListTerm>Company logo</DescriptionListTerm>
              <DescriptionListDescription>
                {resumeOrganization.logoSrc ? (
                  <div className="provider-admin-organizations__logo-preview">
                    <img
                      src={resumeOrganization.logoSrc}
                      alt={
                        resumeOrganization.logoFileName?.trim() ||
                        resumeOrganization.name ||
                        'Company logo'
                      }
                    />
                  </div>
                ) : (
                  '—'
                )}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </div>
      )
    }

    return (
      <div className="provider-admin-organizations__wizard-step tenant-onboarding__step">
        <Content component="p" className="provider-admin-organizations__wizard-lede">
          {isEditMode ? 'Update tenant details.' : 'Enter tenant details.'}
        </Content>
        <Form autoComplete="off" className="provider-admin-organizations__wizard-form">
          <FormGroup label="Tenant name" fieldId="tenant-onboarding-name" isRequired>
            <KubernetesResourceNameField
              id="tenant-onboarding-name"
              value={form.organizationName}
              onChange={(value) =>
                setForm((current) => {
                  const previousSlug = slugifyOrganizationName(current.organizationName)
                  const nextSlug = slugifyOrganizationName(value)
                  const issued = buildRegisterBreakGlassFields(value, current.primaryDomain, {
                    breakGlassUsername:
                      previousSlug === nextSlug ? current.breakGlassUsername : null,
                    breakGlassPassword:
                      previousSlug === nextSlug ? current.breakGlassPassword : null,
                  })
                  const shouldRefreshDisplayName =
                    !current.displayName.trim() ||
                    current.displayName.trim() === current.organizationName.trim()
                  return {
                    ...current,
                    organizationName: value,
                    displayName: shouldRefreshDisplayName ? value : current.displayName,
                    breakGlassUsername: issued.breakGlassUsername,
                    breakGlassPassword: issued.breakGlassPassword,
                  }
                })
              }
              placeholder="e.g. bluesolace-financial-group"
              isRequired
            />
            {nameTaken || slugTaken || nameFormat.validated === 'error' ? (
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">
                    {nameTaken
                      ? 'A tenant with this name is already registered.'
                      : slugTaken
                        ? 'A tenant with this login path already exists. Choose a different name.'
                        : nameFormat.message}
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            ) : null}
          </FormGroup>
          <FormGroup label="Primary email domain" fieldId="tenant-onboarding-primary-domain" isRequired>
            <TextInput
              id="tenant-onboarding-primary-domain"
              value={form.primaryDomain}
              validated={domainTaken ? 'error' : 'default'}
              onChange={(_event, value) =>
                setForm((current) => ({ ...current, primaryDomain: value }))
              }
              placeholder="example.com"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={domainTaken ? 'error' : 'default'}>
                  {domainTaken
                    ? 'This email domain is already mapped to another tenant.'
                    : 'Primary domain for tenant sign-in and IdP association.'}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <AdditionalEmailDomainsField
            idPrefix="tenant-onboarding-additional-domain"
            primaryDomain={form.primaryDomain}
            domains={form.additionalDomains}
            onChange={(additionalDomains) =>
              setForm((current) => ({ ...current, additionalDomains }))
            }
            takenDomains={takenEmailDomains}
          />
          <TenantCompanyLogoField
            id="tenant-onboarding-company-logo"
            logoSrc={form.logoSrc}
            logoFileName={form.logoFileName}
            onLogoChange={(patch) =>
              setForm((current) => ({
                ...current,
                logoSrc: patch.logoSrc ?? current.logoSrc,
                logoFileName: patch.logoFileName ?? current.logoFileName,
              }))
            }
          />
        </Form>
      </div>
    )
  }

  function renderBillingAccountStep() {
    const useThreeColumnAccountGrid = sortedBillingAccounts.length >= 3

    return (
      <div className="provider-admin-organizations__wizard-step tenant-onboarding__step">
        <Content component="p" className="provider-admin-organizations__wizard-lede">
          Choose one M360 billing account for this tenant.
        </Content>

        {selectedAccountInactive && selectedAccount ? (
          <Alert
            variant="warning"
            isInline
            title="Selected account is inactive"
            className="tenant-onboarding__alert"
          >
            Activate it in M360 before linking.{' '}
            <RouterButton
              variant="link"
              isInline
              to={buildM360AccountDetailPath(getM360AccountTenantName(selectedAccount))}
            >
              Open in M360
            </RouterButton>
          </Alert>
        ) : null}

        {billingApiState === 'loading' ? (
          <div className="tenant-onboarding__loading">
            <Spinner size="lg" aria-label="Loading M360 billing accounts" />
            <Content component="p">Retrieving M360 billing accounts…</Content>
          </div>
        ) : null}

        {billingApiState === 'error' ? (
          <Alert
            variant="danger"
            isInline
            title="M360 API unavailable"
            className="tenant-onboarding__alert"
            actionClose={
              <Button variant="link" onClick={retryFetchAccounts}>
                Retry
              </Button>
            }
          >
            We couldn&apos;t retrieve M360 billing accounts. Try again.
          </Alert>
        ) : null}

        {billingApiState === 'ready' && billingAccounts.length === 0 ? (
          <EmptyState>
            <ExclamationTriangleIcon />
            <Title headingLevel="h4" size="md">
              No M360 billing accounts are available
            </Title>
            <EmptyStateBody>
              Create a billing account in M360, then return here and refresh the list.
            </EmptyStateBody>
            <EmptyStateFooter>
              <EmptyStateActions>
                <RouterButton variant="primary" to={M360_ACCOUNTS_PATH}>
                  Create billing account in M360
                </RouterButton>
                <Button
                  variant="link"
                  icon={<RedoIcon aria-hidden />}
                  iconPosition="end"
                  onClick={retryFetchAccounts}
                >
                  Refresh
                </Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        ) : null}

        {billingApiState === 'ready' && billingAccounts.length > 0 ? (
          <Form autoComplete="off" className="provider-admin-organizations__wizard-form">
            <FormGroup label="M360 billing account" fieldId="tenant-onboarding-account" isRequired>
              <div
                id="tenant-onboarding-account"
                className={`provider-setup-template__card-group provider-setup-template__card-group--instance-types tenant-onboarding__account-cards${
                  useThreeColumnAccountGrid
                    ? ' provider-setup-template__card-group--instance-types-fill'
                    : ''
                }`}
                role="radiogroup"
                aria-label="M360 billing account"
              >
                {sortedBillingAccounts.map((account) => {
                  const tenantName = getM360AccountTenantName(account)
                  const isSelected = selectedAccountName === tenantName
                  const titleId = `tenant-onboarding-account-${tenantName}-name`
                  const currentTenantSlug =
                    createdOrganization?.slug ||
                    sourceOrganization?.slug ||
                    draftOrganizationSlug
                  const isInactive = account.accountStatus === 'Inactive'
                  const isLinkedElsewhere = isM360AccountLinkedToAnotherTenant(
                    account,
                    currentTenantSlug,
                  )
                  const isDisabled = isLinkedElsewhere || isInactive
                  const linkedTenantLabel = formatM360PortalValue(
                    account.externalId?.trim() || account.linkedTenantSlug,
                  )
                  const billingId = formatM360PortalValue(
                    account.accountNumber || account.accountId,
                  )

                  return (
                    <button
                      key={account.accountId}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-disabled={isDisabled}
                      aria-labelledby={titleId}
                      className={`provider-setup-template__select-card provider-setup-template__select-card--instance-type tenant-onboarding__account-select-card${
                        isSelected ? ' provider-setup-template__select-card--selected' : ''
                      }${isDisabled ? ' tenant-onboarding__account-select-card--linked' : ''}`}
                      onClick={() => {
                        if (!isDisabled) {
                          setSelectedAccountName(tenantName)
                        }
                      }}
                    >
                      {isSelected ? (
                        <Label
                          color="grey"
                          isCompact
                          className="provider-setup-template__select-card-selected-badge"
                        >
                          Selected
                        </Label>
                      ) : isInactive ? (
                        <Label
                          color="orange"
                          isCompact
                          className="provider-setup-template__select-card-selected-badge"
                        >
                          Inactive
                        </Label>
                      ) : isLinkedElsewhere ? (
                        <Label
                          color="purple"
                          isCompact
                          className="provider-setup-template__select-card-selected-badge"
                        >
                          Already linked
                        </Label>
                      ) : null}
                      <Title
                        id={titleId}
                        headingLevel="h3"
                        size="md"
                        className="provider-setup-template__select-card-title"
                      >
                        {tenantName}
                      </Title>
                      <Content
                        component="p"
                        className="provider-setup-template__select-card-detail"
                      >
                        {billingId}
                      </Content>
                      {isLinkedElsewhere ? (
                        <Content
                          component="p"
                          className="provider-setup-template__select-card-accelerator"
                        >
                          Linked to {linkedTenantLabel}
                        </Content>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              <div className="tenant-onboarding__account-hint" role="note">
                <div className="tenant-onboarding__account-hint-copy">
                  <InfoCircleIcon className="tenant-onboarding__account-hint-icon" aria-hidden />
                  <Content component="p" className="tenant-onboarding__account-hint-text">
                    Don&apos;t see the right account?
                  </Content>
                </div>
                <div className="tenant-onboarding__account-hint-actions">
                  <ExternalLinkButton href={m360AccountsHref} variant="link">
                    Open M360 accounts
                  </ExternalLinkButton>
                  <Button
                    variant="link"
                    isInline
                    icon={<RedoIcon aria-hidden />}
                    iconPosition="end"
                    onClick={retryFetchAccounts}
                  >
                    Refresh list
                  </Button>
                </div>
              </div>
            </FormGroup>

            {accountConflict ? (
              <Alert variant="danger" isInline title="Account already linked">
                {getM360AccountLinkConflictMessage(selectedAccount!)}
              </Alert>
            ) : null}
          </Form>
        ) : null}
      </div>
    )
  }

  function renderReviewStep() {
    if (isEditMode) {
      return (
        <div className="provider-admin-organizations__wizard-step tenant-onboarding__step">
          <Content component="p" className="provider-admin-organizations__wizard-lede">
            Review your changes before saving.
          </Content>
          <CatalogEditChangesSummary changes={editChanges} ariaLabel="Tenant changes" />
          {linkError ? (
            <Alert
              variant="danger"
              isInline
              title="Unable to save tenant"
              className="tenant-onboarding__alert"
            >
              {linkError}
            </Alert>
          ) : null}
        </div>
      )
    }

    const organization = createdOrganization ?? sourceOrganization
    const tenantName = organization?.name || draftTenantName || '—'
    const primaryDomain =
      organization?.primaryDomain || normalizePrimaryDomain(form.primaryDomain) || '—'
    const reviewAdditionalDomains = normalizeAdditionalDomains(
      organization?.additionalDomains ?? form.additionalDomains,
      primaryDomain === '—' ? form.primaryDomain : primaryDomain,
    )
    const logoSrc = organization?.logoSrc?.trim() || form.logoSrc.trim()
    const logoFileName =
      organization?.logoFileName?.trim() || form.logoFileName.trim() || tenantName

    return (
      <div className="provider-admin-organizations__wizard-step tenant-onboarding__step">
        <Content component="p" className="provider-admin-organizations__wizard-lede">
          {isExistingTenantMode
            ? 'Review your tenant and billing settings before saving.'
            : 'Review your tenant and billing settings before registering.'}
        </Content>
        <DescriptionList isCompact className="provider-admin-organizations__wizard-review">
          <DescriptionListGroup>
            <DescriptionListTerm>Tenant name</DescriptionListTerm>
            <DescriptionListDescription>{tenantName}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Primary email domain</DescriptionListTerm>
            <DescriptionListDescription>{primaryDomain}</DescriptionListDescription>
          </DescriptionListGroup>
          {reviewAdditionalDomains.length > 0 ? (
            <DescriptionListGroup>
              <DescriptionListTerm>Additional email domains</DescriptionListTerm>
              <DescriptionListDescription>
                <AdditionalEmailDomainsValue domains={reviewAdditionalDomains} />
              </DescriptionListDescription>
            </DescriptionListGroup>
          ) : null}
          <DescriptionListGroup>
            <DescriptionListTerm>Company logo</DescriptionListTerm>
            <DescriptionListDescription>
              {logoSrc ? (
                <div className="provider-admin-organizations__logo-preview">
                  <img src={logoSrc} alt={logoFileName || 'Company logo'} />
                </div>
              ) : (
                '—'
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>M360 billing account</DescriptionListTerm>
            <DescriptionListDescription>
              {selectedAccount ? getM360AccountTenantName(selectedAccount) : '—'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
        {linkError ? (
          <Alert variant="danger" isInline title="Unable to register tenant" className="tenant-onboarding__alert">
            {linkError}
          </Alert>
        ) : null}
      </div>
    )
  }

  function renderStepContent(stepId: TenantOnboardingStepId) {
    switch (stepId) {
      case 'general':
        return renderGeneralStep()
      case 'billing_account':
        return renderBillingAccountStep()
      case 'review':
        return renderReviewStep()
      default:
        return null
    }
  }

  function getStepFooter(stepId: TenantOnboardingStepId) {
    if (stepId === 'general') {
      return (
        <TenantOnboardingNavigateFooter
          onClose={requestClose}
          isNextDisabled={isResumeBillingMode ? false : !isGeneralStepValid}
          onNavigateNext={() =>
            isResumeBillingMode ? true : handleCreateTenant()
          }
        />
      )
    }

    if (stepId === 'billing_account') {
      const canContinue =
        billingApiState === 'ready' &&
        Boolean(selectedAccountName) &&
        !accountConflict &&
        !selectedAccountInactive

      return wrapStepFooter({
        isNextDisabled: !canContinue,
      })
    }

    if (stepId === 'review') {
      const canRegister =
        Boolean(selectedAccount) && !accountConflict && canSaveOrganizationEdit

      return (
        <TenantOnboardingNavigateFooter
          onClose={requestClose}
          isNextDisabled={isLinking || !canRegister}
          nextButtonText={
            isLinking
              ? isExistingTenantMode
                ? 'Saving…'
                : 'Registering…'
              : isExistingTenantMode
                ? 'Save'
                : 'Register tenant'
          }
          onNavigateNext={async () => {
            const linked = await handleLinkBillingAccount()
            if (linked) {
              onComplete?.(linked)
              handleClose()
            }
            return false
          }}
        />
      )
    }

    return undefined
  }

  if (!isOpen) {
    return null
  }

  const wizardKey = editingOrganization
    ? `tenant-onboarding-edit-${editingOrganization.id}-${initialStepId}`
    : resumeOrganization
      ? `tenant-onboarding-resume-${resumeOrganization.id}`
      : 'tenant-onboarding-wizard'

  const wizard = (
    <Wizard
      key={wizardKey}
      className="provider-admin-organizations__wizard tenant-onboarding__wizard"
      height={isPage ? '100%' : '40rem'}
      isPlain={isPage}
      onClose={isPage ? undefined : requestClose}
      startIndex={wizardStartIndex}
      header={
        isPage ? undefined : (
          <WizardHeader
            title={wizardTitle}
            titleId="tenant-onboarding-wizard-title"
            onClose={requestClose}
            closeButtonAriaLabel={`Close ${wizardTitle.toLowerCase()} wizard`}
          />
        )
      }
    >
      {TENANT_ONBOARDING_STEPS.map((step) => (
        <WizardStep
          key={step.id}
          name={
            isEditMode && modifiedStepIds.has(step.id)
              ? `${step.label} (modified)`
              : step.label
          }
          id={`tenant-onboarding-step-${step.id}`}
          isDisabled={isStepDisabled(step.id)}
          footer={getStepFooter(step.id)}
        >
          {renderStepContent(step.id)}
        </WizardStep>
      ))}
    </Wizard>
  )

  if (isPage) {
    return (
      <ResourceCreatePageShell
        parentLabel="Tenants"
        title={wizardTitle}
        titleId="tenant-onboarding-wizard-title"
        onBack={requestClose}
      >
        {wizard}
        {leaveConfirmModal}
      </ResourceCreatePageShell>
    )
  }

  return (
    <>
      <Modal
        variant={ModalVariant.medium}
        width="64rem"
        maxWidth="64rem"
        isOpen={isOpen}
        onEscapePress={requestClose}
        aria-labelledby="tenant-onboarding-wizard-title"
        className="provider-admin-organizations__wizard-modal"
      >
        {wizard}
      </Modal>
      {leaveConfirmModal}
    </>
  )
}
