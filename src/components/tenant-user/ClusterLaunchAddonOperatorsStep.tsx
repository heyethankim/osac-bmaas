import { useRef } from 'react'
import { LockIcon } from '@patternfly/react-icons/dist/esm/icons/lock-icon'
import {
  Alert,
  AlertActionLink,
  Checkbox,
  Content,
  FormSelect,
  FormSelectOption,
  Label,
  LabelGroup,
  SearchInput,
  Tooltip,
  useWizardContext,
} from '@patternfly/react-core'
import {
  CLUSTER_ADDON_OPERATOR_CATEGORY_OPTIONS,
  filterClusterAddonOperators,
  formatAddonOperatorsHeaderCard,
  getAddonOperatorShortName,
  getLaunchAdditionalAddonOperators,
  getLaunchAddonCompatibilityBadge,
  getClusterAddonOperatorResolvedVersion,
  getLaunchAddonOperatorById,
  isClusterAddonOperatorCompatibleWithVersion,
  isLaunchUserAddonAutoBundled,
  resolveTemplateAddonOperatorSelections,
  toggleLaunchUserAddonOperator,
  type ClusterAddonOperatorCategory,
  type ClusterAddonOperatorSelection,
} from '../../catalog/clusterAddonOperators'
import { useCatalogCardGridMasonry } from '../../catalog/useCatalogCardGridMasonry'

export type ClusterLaunchAddonOperatorsStepProps = {
  clusterVersionId: string
  /** When locked, tenants cannot deselect template operators or add extras. */
  accessMode?: 'locked' | 'editable'
  templateSelections: ReadonlyArray<ClusterAddonOperatorSelection>
  deselectedOptionalTemplateIds: ReadonlyArray<string>
  onDeselectedOptionalTemplateIdsChange: (next: string[]) => void
  userAddonOperatorIds: ReadonlyArray<string>
  onUserAddonOperatorIdsChange: (next: string[]) => void
  filterQuery: string
  onFilterQueryChange: (query: string) => void
  category: ClusterAddonOperatorCategory
  onCategoryChange: (category: ClusterAddonOperatorCategory) => void
}

export function ClusterLaunchAddonOperatorsStep({
  clusterVersionId,
  accessMode = 'locked',
  templateSelections,
  deselectedOptionalTemplateIds,
  onDeselectedOptionalTemplateIdsChange,
  userAddonOperatorIds,
  onUserAddonOperatorIdsChange,
  filterQuery,
  onFilterQueryChange,
  category,
  onCategoryChange,
}: ClusterLaunchAddonOperatorsStepProps) {
  const { goToStepById } = useWizardContext()
  const isEditable = accessMode === 'editable'
  const resolvedTemplate = resolveTemplateAddonOperatorSelections(templateSelections)
  const deselectedOptional = new Set(
    isEditable ? deselectedOptionalTemplateIds : [],
  )
  const additionalOperators = getLaunchAdditionalAddonOperators(resolvedTemplate)
  const visibleAdditional = filterClusterAddonOperators(additionalOperators, {
    query: filterQuery,
    category,
  })

  const templateListRef = useRef<HTMLUListElement>(null)
  const additionalListRef = useRef<HTMLUListElement>(null)
  const templateMasonryKey = [
    clusterVersionId,
    resolvedTemplate.map((entry) => entry.operatorId).join(','),
    [...deselectedOptional].join(','),
  ].join('|')
  const additionalMasonryKey = [
    clusterVersionId,
    filterQuery,
    category,
    userAddonOperatorIds.join(','),
    String(visibleAdditional.length),
  ].join('|')
  useCatalogCardGridMasonry(templateListRef, true, templateMasonryKey, 1)
  useCatalogCardGridMasonry(additionalListRef, isEditable, additionalMasonryKey, 1)

  return (
    <div className="tenant-user-launch-wizard__step tenant-user-launch-wizard__addon-operators-step">
      <Content component="p" className="tenant-user-launch-wizard__step-lede">
        {isEditable
          ? 'Review included operators and select any additional ones.'
          : 'These operators are locked by the catalog item.'}
      </Content>

      <section
        className="tenant-user-launch-wizard__addon-operators-section"
        aria-labelledby="launch-addon-operators-template-heading"
      >
        <Content
          component="h3"
          id="launch-addon-operators-template-heading"
          className="tenant-user-launch-wizard__addon-operators-section-title"
        >
          Included with catalog item
        </Content>
        <ul
          ref={templateListRef}
          className="tenant-user-launch-wizard__addon-operators-list"
        >
          {resolvedTemplate.map((selection) => {
            const operator = getLaunchAddonOperatorById(selection.operatorId)
            if (!operator) {
              return null
            }
            const isMandatory = !isEditable || selection.mode === 'mandatory'
            const isDependencyOnly =
              isMandatory &&
              resolvedTemplate.some(
                (parent) =>
                  parent.operatorId !== selection.operatorId &&
                  getLaunchAddonOperatorById(parent.operatorId)?.dependencyIds?.includes(
                    selection.operatorId,
                  ),
              )
            const isSelected = isMandatory || !deselectedOptional.has(selection.operatorId)
            const statusLabel = isDependencyOnly
              ? 'Required Dependency'
              : isMandatory
                ? 'Locked by Catalog Item'
                : 'Optional Default'
            const checkboxId = `launch-template-addon-${selection.operatorId}`
            const dependencyNote = operator.dependencyNote.trim()
            const requirementNote = operator.requirementNote.trim()
            const constraintChips: Array<{
              id: string
              label: string
              color: 'grey' | 'green'
            }> = []
            if (requirementNote) {
              constraintChips.push({
                id: 'requirement',
                label: requirementNote,
                color: 'grey',
              })
            }
            if (dependencyNote && dependencyNote.toLowerCase() !== 'none') {
              constraintChips.push({
                id: 'dependency',
                label: `Includes ${dependencyNote.replace(/\s*\(Auto-bundled\)\s*$/i, '')}`,
                color: 'green',
              })
            }

            return (
              <li
                key={selection.operatorId}
                className={`tenant-user-launch-wizard__addon-operator-card${
                  isSelected
                    ? ' tenant-user-launch-wizard__addon-operator-card--selected'
                    : ''
                }`}
              >
                <div className="tenant-user-launch-wizard__addon-operator-card-header">
                  <label
                    htmlFor={checkboxId}
                    className="tenant-user-launch-wizard__addon-operator-label"
                  >
                    <img
                      className="tenant-user-launch-wizard__addon-operator-logo"
                      src={operator.logoSrc}
                      alt=""
                    />
                    <span className="tenant-user-launch-wizard__addon-operator-title">
                      <span className="tenant-user-launch-wizard__addon-operator-name">
                        {operator.name}
                      </span>
                      <span className="tenant-user-launch-wizard__addon-operator-version">
                        Version:{' '}
                        {getClusterAddonOperatorResolvedVersion(operator, clusterVersionId)}
                      </span>
                    </span>
                  </label>
                  <div className="tenant-user-launch-wizard__addon-operator-meta">
                    {isMandatory ? (
                      <Tooltip content="Included with this catalog item. Cannot be deselected.">
                        <span className="tenant-user-launch-wizard__addon-operator-lock">
                          <LockIcon aria-hidden />
                          <Label color="grey" isCompact>
                            {statusLabel}
                          </Label>
                        </span>
                      </Tooltip>
                    ) : (
                      <Label color="blue" isCompact>
                        {statusLabel}
                      </Label>
                    )}
                    <Checkbox
                      id={checkboxId}
                      className="tenant-user-launch-wizard__addon-operator-checkbox"
                      isChecked={isSelected}
                      isDisabled={isMandatory}
                      aria-label={operator.name}
                      onChange={(_event, checked) => {
                        if (isMandatory) {
                          return
                        }
                        const next = new Set(deselectedOptional)
                        if (checked) {
                          next.delete(selection.operatorId)
                        } else {
                          next.add(selection.operatorId)
                        }
                        onDeselectedOptionalTemplateIdsChange([...next])
                      }}
                    />
                  </div>
                </div>
                <Content
                  component="p"
                  className="tenant-user-launch-wizard__addon-operator-description"
                >
                  {operator.description}
                </Content>
                {constraintChips.length > 0 ? (
                  <div
                    className="tenant-user-launch-wizard__addon-operator-constraints"
                    aria-label="Operator constraints"
                  >
                    {constraintChips.map((chip) => (
                      <Label
                        key={chip.id}
                        color={chip.color}
                        isCompact
                        className="tenant-user-launch-wizard__addon-operator-constraint"
                      >
                        {chip.label}
                      </Label>
                    ))}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>

      {isEditable ? (
        <section
          className="tenant-user-launch-wizard__addon-operators-section"
          aria-labelledby="launch-addon-operators-additional-heading"
        >
          <Content
            component="h3"
            id="launch-addon-operators-additional-heading"
            className="tenant-user-launch-wizard__addon-operators-section-title"
          >
            Additional Available Operators
          </Content>
          <div className="tenant-user-launch-wizard__addon-operators-toolbar">
            <FormSelect
              id="launch-addon-operator-category"
              className="tenant-user-launch-wizard__addon-operators-category"
              value={category}
              onChange={(_event, value) =>
                onCategoryChange(value as ClusterAddonOperatorCategory)
              }
              aria-label="Filter operators by category"
            >
              {CLUSTER_ADDON_OPERATOR_CATEGORY_OPTIONS.map((option) => (
                <FormSelectOption
                  key={option.value}
                  value={option.value}
                  label={option.label}
                />
              ))}
            </FormSelect>
            <SearchInput
              className="tenant-user-launch-wizard__addon-operators-search"
              placeholder="Search operators"
              value={filterQuery}
              onChange={(_event, value) => onFilterQueryChange(value)}
              onClear={() => onFilterQueryChange('')}
              aria-label="Search operators"
            />
          </div>
          <div
            className="tenant-user-launch-wizard__addon-operators-selection-bar"
            aria-live="polite"
          >
            {userAddonOperatorIds.length === 0 ? (
              <Content
                component="p"
                className="tenant-user-launch-wizard__addon-operators-selection-hint"
              >
                None selected yet — check one or more operators below.
              </Content>
            ) : (
              <>
                <Content
                  component="p"
                  className="tenant-user-launch-wizard__addon-operators-selection-count"
                >
                  {userAddonOperatorIds.length === 1
                    ? '1 selected'
                    : `${userAddonOperatorIds.length} selected`}
                </Content>
                <LabelGroup
                  className="tenant-user-launch-wizard__addon-operators-selection-chips"
                  numLabels={8}
                  aria-label="Selected additional operators"
                >
                  {userAddonOperatorIds.map((operatorId) => {
                    const isAutoBundled = isLaunchUserAddonAutoBundled(
                      userAddonOperatorIds,
                      operatorId,
                    )
                    return (
                      <Label
                        key={operatorId}
                        color="blue"
                        onClose={
                          isAutoBundled
                            ? undefined
                            : () =>
                                onUserAddonOperatorIdsChange(
                                  toggleLaunchUserAddonOperator(
                                    userAddonOperatorIds,
                                    operatorId,
                                    false,
                                  ),
                                )
                        }
                        closeBtnAriaLabel={`Remove ${getAddonOperatorShortName(operatorId)}`}
                      >
                        {getAddonOperatorShortName(operatorId)}
                      </Label>
                    )
                  })}
                </LabelGroup>
              </>
            )}
          </div>
          <ul
            ref={additionalListRef}
            className="tenant-user-launch-wizard__addon-operators-list"
            aria-label="Additional add-on operators"
          >
            {visibleAdditional.map((operator) => {
              const isSelected = userAddonOperatorIds.includes(operator.id)
              const isAutoBundled = isLaunchUserAddonAutoBundled(
                userAddonOperatorIds,
                operator.id,
              )
              const isCompatible = isClusterAddonOperatorCompatibleWithVersion(
                operator,
                clusterVersionId,
              )
              const compatibilityBadge = getLaunchAddonCompatibilityBadge(
                operator,
                clusterVersionId,
              )
              const isCheckboxDisabled = !isCompatible || isAutoBundled
              const checkboxId = `launch-user-addon-${operator.id}`
              const dependencyNote = operator.dependencyNote.trim()
              const requirementNote = operator.requirementNote.trim()
              const constraintChips: Array<{
                id: string
                label: string
                color: 'grey' | 'green'
              }> = []
              if (requirementNote) {
                constraintChips.push({
                  id: 'requirement',
                  label: requirementNote,
                  color: 'grey',
                })
              }
              if (dependencyNote && dependencyNote.toLowerCase() !== 'none') {
                constraintChips.push({
                  id: 'dependency',
                  label: `Includes ${dependencyNote.replace(/\s*\(Auto-bundled\)\s*$/i, '')}`,
                  color: 'green',
                })
              }

              return (
                <li
                  key={operator.id}
                  className={`tenant-user-launch-wizard__addon-operator-card${
                    isSelected
                      ? ' tenant-user-launch-wizard__addon-operator-card--selected'
                      : ''
                  }${
                    isAutoBundled
                      ? ' tenant-user-launch-wizard__addon-operator-card--dependency'
                      : ''
                  }${
                    !isCompatible
                      ? ' tenant-user-launch-wizard__addon-operator-card--incompatible'
                      : ''
                  }`}
                >
                  <div className="tenant-user-launch-wizard__addon-operator-card-header">
                    <label
                      htmlFor={checkboxId}
                      className="tenant-user-launch-wizard__addon-operator-label"
                    >
                      <img
                        className="tenant-user-launch-wizard__addon-operator-logo"
                        src={operator.logoSrc}
                        alt=""
                      />
                      <span className="tenant-user-launch-wizard__addon-operator-title">
                        <span className="tenant-user-launch-wizard__addon-operator-name">
                          {operator.name}
                        </span>
                        <span className="tenant-user-launch-wizard__addon-operator-version">
                          Version:{' '}
                          {getClusterAddonOperatorResolvedVersion(
                            operator,
                            clusterVersionId,
                          )}
                        </span>
                      </span>
                    </label>
                    <div className="tenant-user-launch-wizard__addon-operator-meta">
                      {isAutoBundled ? (
                        <Label color="grey" isCompact>
                          Auto-included dependency
                        </Label>
                      ) : null}
                      <Checkbox
                        id={checkboxId}
                        className="tenant-user-launch-wizard__addon-operator-checkbox"
                        isChecked={isSelected}
                        isDisabled={isCheckboxDisabled}
                        aria-label={operator.name}
                        onChange={(_event, checked) => {
                          if (isCheckboxDisabled) {
                            return
                          }
                          onUserAddonOperatorIdsChange(
                            toggleLaunchUserAddonOperator(
                              userAddonOperatorIds,
                              operator.id,
                              checked,
                            ),
                          )
                        }}
                      />
                    </div>
                  </div>
                  <Content
                    component="p"
                    className="tenant-user-launch-wizard__addon-operator-description"
                  >
                    {operator.description}
                  </Content>
                  {isCompatible && constraintChips.length > 0 ? (
                    <div
                      className="tenant-user-launch-wizard__addon-operator-constraints"
                      aria-label="Operator constraints"
                    >
                      {constraintChips.map((chip) => (
                        <Label
                          key={chip.id}
                          color={chip.color}
                          isCompact
                          className="tenant-user-launch-wizard__addon-operator-constraint"
                        >
                          {chip.label}
                        </Label>
                      ))}
                    </div>
                  ) : null}
                  {!isCompatible && compatibilityBadge ? (
                    <Alert
                      variant="danger"
                      isInline
                      title={compatibilityBadge}
                      className="tenant-user-launch-wizard__addon-operator-incompat-alert"
                      actionLinks={
                        <AlertActionLink
                          component="button"
                          onClick={() =>
                            goToStepById('launch-instance-step-cluster-version')
                          }
                        >
                          Change cluster version
                        </AlertActionLink>
                      }
                    />
                  ) : null}
                </li>
              )
            })}
          </ul>
          {visibleAdditional.length === 0 ? (
            <Content component="p">No additional operators match this search.</Content>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

export function buildClusterLaunchAddonHeaderCard(
  templateSelections: ReadonlyArray<ClusterAddonOperatorSelection> | undefined | null,
): { label: string; value: string; detail: string } {
  const resolved = resolveTemplateAddonOperatorSelections(templateSelections, {
    fallbackToDemo: !templateSelections?.length,
  })
  const shortNames = resolved.map((selection) =>
    getAddonOperatorShortName(selection.operatorId),
  )
  const card = formatAddonOperatorsHeaderCard({
    count: resolved.length,
    shortNames,
  })
  return {
    label: 'Add-on operators',
    value: card.value,
    detail: card.detail,
  }
}
