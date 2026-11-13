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
  CLUSTER_ADDON_OPERATORS,
  CLUSTER_ADDON_OPERATOR_CATEGORY_OPTIONS,
  filterClusterAddonOperators,
  formatAddonOperatorsHeaderCard,
  getAddonOperatorShortName,
  getLaunchAddonCompatibilityBadge,
  getClusterAddonOperatorResolvedVersion,
  getLaunchAddonOperatorById,
  isClusterAddonOperatorCompatibleWithVersion,
  isLaunchUserAddonAutoBundled,
  resolveTemplateAddonOperatorSelections,
  toggleLaunchUserAddonOperator,
  type ClusterAddonOperatorCategory,
  type ClusterAddonOperatorDefinition,
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

function buildConstraintChips(operator: ClusterAddonOperatorDefinition): Array<{
  id: string
  label: string
  color: 'grey' | 'green'
}> {
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
  return constraintChips
}

export function ClusterLaunchAddonOperatorsStep({
  clusterVersionId,
  accessMode = 'locked',
  templateSelections,
  userAddonOperatorIds,
  onUserAddonOperatorIdsChange,
  filterQuery,
  onFilterQueryChange,
  category,
  onCategoryChange,
}: ClusterLaunchAddonOperatorsStepProps) {
  const { goToStepById } = useWizardContext()
  const isEditable = accessMode === 'editable'
  const resolvedTemplate = isEditable
    ? []
    : resolveTemplateAddonOperatorSelections(templateSelections)

  const availableOperators = isEditable
    ? filterClusterAddonOperators(CLUSTER_ADDON_OPERATORS, {
        query: filterQuery,
        category,
      })
    : []

  const templateListRef = useRef<HTMLUListElement>(null)
  const availableListRef = useRef<HTMLUListElement>(null)
  const templateMasonryKey = [
    clusterVersionId,
    resolvedTemplate.map((entry) => entry.operatorId).join(','),
  ].join('|')
  const availableMasonryKey = [
    clusterVersionId,
    filterQuery,
    category,
    userAddonOperatorIds.join(','),
    String(availableOperators.length),
  ].join('|')
  useCatalogCardGridMasonry(templateListRef, !isEditable, templateMasonryKey, 1)
  useCatalogCardGridMasonry(availableListRef, isEditable, availableMasonryKey, 1)

  return (
    <div className="tenant-user-launch-wizard__step tenant-user-launch-wizard__addon-operators-step">
      <Content component="p" className="tenant-user-launch-wizard__step-lede">
        {isEditable
          ? 'Select the operators to install with this cluster.'
          : 'These operators are locked by the catalog item.'}
      </Content>

      {!isEditable ? (
        <section
          className="tenant-user-launch-wizard__addon-operators-section"
          aria-labelledby="launch-addon-operators-template-heading"
        >
          <Content
            component="h3"
            id="launch-addon-operators-template-heading"
            className="tenant-user-launch-wizard__addon-operators-section-title"
          >
            Included operators
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
              const isDependencyOnly = resolvedTemplate.some(
                (parent) =>
                  parent.operatorId !== selection.operatorId &&
                  getLaunchAddonOperatorById(parent.operatorId)?.dependencyIds?.includes(
                    selection.operatorId,
                  ),
              )
              const statusLabel = isDependencyOnly
                ? 'Required Dependency'
                : 'Locked by Catalog Item'
              const checkboxId = `launch-template-addon-${selection.operatorId}`
              const constraintChips = buildConstraintChips(operator)

              return (
                <li
                  key={selection.operatorId}
                  className="tenant-user-launch-wizard__addon-operator-card tenant-user-launch-wizard__addon-operator-card--selected"
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
                      <Tooltip content="Included with this catalog item. Cannot be deselected.">
                        <span className="tenant-user-launch-wizard__addon-operator-lock">
                          <LockIcon aria-hidden />
                          <Label color="grey" isCompact>
                            {statusLabel}
                          </Label>
                        </span>
                      </Tooltip>
                      <Checkbox
                        id={checkboxId}
                        className="tenant-user-launch-wizard__addon-operator-checkbox"
                        isChecked
                        isDisabled
                        aria-label={operator.name}
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
      ) : (
        <section
          className="tenant-user-launch-wizard__addon-operators-section"
          aria-labelledby="launch-addon-operators-available-heading"
        >
          <Content
            component="h3"
            id="launch-addon-operators-available-heading"
            className="tenant-user-launch-wizard__addon-operators-section-title"
          >
            Available operators
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
                  aria-label="Selected operators"
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
            ref={availableListRef}
            className="tenant-user-launch-wizard__addon-operators-list"
            aria-label="Available add-on operators"
          >
            {availableOperators.map((operator) => {
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
              const constraintChips = buildConstraintChips(operator)

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
          {availableOperators.length === 0 ? (
            <Content component="p">No operators match this search.</Content>
          ) : null}
        </section>
      )}
    </div>
  )
}

export function buildClusterLaunchAddonHeaderCard(
  templateSelections: ReadonlyArray<ClusterAddonOperatorSelection> | undefined | null,
  options?: { accessMode?: 'locked' | 'editable' },
): { label: string; value: string; detail: string } {
  if (options?.accessMode === 'editable') {
    return {
      label: 'Add-on operators',
      value: 'Select at launch',
      detail: '',
    }
  }

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
