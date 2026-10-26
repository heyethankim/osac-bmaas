import { useRef } from 'react'
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
  Title,
  useWizardContext,
} from '@patternfly/react-core'
import type { CatalogAddonOperatorsMode } from '../../catalog/catalogPublishConfig'
import { useCatalogCardGridMasonry } from '../../catalog/useCatalogCardGridMasonry'
import {
  CLUSTER_ADDON_OPERATORS,
  CLUSTER_ADDON_OPERATOR_CATEGORY_OPTIONS,
  CLUSTER_ADDON_OPERATOR_SELECTION_MODE_OPTIONS,
  deselectClusterAddonOperator,
  filterClusterAddonOperators,
  getAddonOperatorShortName,
  getClusterAddonOperatorIncompatibilityMessage,
  getClusterAddonOperatorResolvedVersion,
  getMutualExclusionMessage,
  isClusterAddonOperatorAutoBundled,
  selectClusterAddonOperator,
  setClusterAddonOperatorSelectionMode,
  type ClusterAddonOperatorCategory,
  type ClusterAddonOperatorSelection,
  type ClusterAddonOperatorSelectionMode,
} from '../../catalog/clusterAddonOperators'

export type ClusterAddonOperatorsStepProps = {
  clusterVersionId: string
  accessMode: CatalogAddonOperatorsMode
  selections: ReadonlyArray<ClusterAddonOperatorSelection>
  onSelectionsChange: (next: ClusterAddonOperatorSelection[]) => void
  filterQuery: string
  onFilterQueryChange: (query: string) => void
  category: ClusterAddonOperatorCategory
  onCategoryChange: (category: ClusterAddonOperatorCategory) => void
}

export function ClusterAddonOperatorsStep({
  clusterVersionId,
  accessMode,
  selections,
  onSelectionsChange,
  filterQuery,
  onFilterQueryChange,
  category,
  onCategoryChange,
}: ClusterAddonOperatorsStepProps) {
  const { goToStepById } = useWizardContext()
  const isEditable = accessMode === 'editable'
  const selectionById = new Map(
    selections.map((selection) => [selection.operatorId, selection]),
  )
  const selectedIds = selections.map((selection) => selection.operatorId)
  const visibleOperators = filterClusterAddonOperators(CLUSTER_ADDON_OPERATORS, {
    query: filterQuery,
    category,
  })
  const listRef = useRef<HTMLUListElement>(null)
  const masonryLayoutKey = [
    filterQuery,
    category,
    clusterVersionId,
    selections.map((entry) => `${entry.operatorId}:${entry.mode}`).join(','),
    String(visibleOperators.length),
  ].join('|')
  useCatalogCardGridMasonry(listRef, true, masonryLayoutKey, 1)

  return (
    <div
      id="publish-catalog-addon-operators"
      className="provider-setup-template__addon-operators-step"
    >
      <div className="provider-setup-template__addon-operators-toolbar">
        <FormSelect
          id="publish-catalog-addon-operator-category"
          className="provider-setup-template__addon-operators-category"
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
          className="provider-setup-template__addon-operators-search"
          placeholder="Search operators"
          value={filterQuery}
          onChange={(_event, value) => onFilterQueryChange(value)}
          onClear={() => onFilterQueryChange('')}
          aria-label="Search operators"
        />
      </div>

      <div
        className="provider-setup-template__addon-operators-selection-bar"
        aria-live="polite"
      >
        {selections.length === 0 ? (
          <Content
            component="p"
            className="provider-setup-template__addon-operators-selection-hint"
          >
            None selected yet — check one or more operators below.
          </Content>
        ) : (
          <>
            <Content
              component="p"
              className="provider-setup-template__addon-operators-selection-count"
            >
              {selections.length === 1 ? '1 selected' : `${selections.length} selected`}
            </Content>
            <LabelGroup
              className="provider-setup-template__addon-operators-selection-chips"
              numLabels={8}
              aria-label="Selected add-on operators"
            >
              {selections.map((selection) => {
                const isAutoBundled = isClusterAddonOperatorAutoBundled(
                  selections,
                  selection.operatorId,
                )
                return (
                  <Label
                    key={selection.operatorId}
                    color="blue"
                    onClose={
                      isAutoBundled
                        ? undefined
                        : () =>
                            onSelectionsChange(
                              deselectClusterAddonOperator(
                                selections,
                                selection.operatorId,
                              ),
                            )
                    }
                    closeBtnAriaLabel={`Remove ${getAddonOperatorShortName(selection.operatorId)}`}
                  >
                    {getAddonOperatorShortName(selection.operatorId)}
                  </Label>
                )
              })}
            </LabelGroup>
          </>
        )}
      </div>

      <ul
        ref={listRef}
        className="provider-setup-template__addon-operators-list"
        aria-label="Add-on operators"
      >
        {visibleOperators.map((operator) => {
          const selection = selectionById.get(operator.id)
          const isSelected = Boolean(selection)
          const isAutoBundled = isClusterAddonOperatorAutoBundled(selections, operator.id)
          const incompatibilityMessage = getClusterAddonOperatorIncompatibilityMessage(
            operator,
            clusterVersionId,
          )
          const isIncompatible = Boolean(incompatibilityMessage)
          const exclusionMessage = isSelected
            ? null
            : getMutualExclusionMessage(operator, selectedIds)
          const isExcluded = Boolean(exclusionMessage)
          /** Bundled deps stay selected while a parent operator is attached. */
          const isCheckboxDisabled = isIncompatible || isAutoBundled || isExcluded
          const mode: ClusterAddonOperatorSelectionMode =
            selection?.mode ?? (isAutoBundled || !isEditable ? 'mandatory' : 'optional-default')

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
              className={`provider-setup-template__addon-operator-card${
                isSelected ? ' provider-setup-template__addon-operator-card--selected' : ''
              }${
                isIncompatible || isExcluded
                  ? ' provider-setup-template__addon-operator-card--incompatible'
                  : ''
              }`}
            >
              <div className="provider-setup-template__addon-operator-card-header">
                <label
                  htmlFor={`publish-catalog-addon-operator-${operator.id}`}
                  className="provider-setup-template__addon-operator-label"
                >
                  <img
                    className="provider-setup-template__addon-operator-logo"
                    src={operator.logoSrc}
                    alt=""
                  />
                  <span className="provider-setup-template__addon-operator-title">
                    <span className="provider-setup-template__addon-operator-name">
                      {operator.name}
                    </span>
                    <span className="provider-setup-template__addon-operator-version">
                      Version:{' '}
                      {getClusterAddonOperatorResolvedVersion(operator, clusterVersionId)}
                    </span>
                  </span>
                </label>
                <div className="provider-setup-template__addon-operator-meta">
                  {isSelected && isEditable ? (
                    <FormSelect
                      id={`publish-catalog-addon-operator-mode-${operator.id}`}
                      className="provider-setup-template__addon-operator-mode"
                      value={mode}
                      isDisabled={isAutoBundled}
                      aria-label={`${operator.name} selection mode`}
                      onChange={(_event, value) => {
                        const nextMode = value as ClusterAddonOperatorSelectionMode
                        onSelectionsChange(
                          setClusterAddonOperatorSelectionMode(
                            selections,
                            operator.id,
                            nextMode,
                          ),
                        )
                      }}
                    >
                      {CLUSTER_ADDON_OPERATOR_SELECTION_MODE_OPTIONS.map((option) => (
                        <FormSelectOption
                          key={option.value}
                          value={option.value}
                          label={option.label}
                        />
                      ))}
                    </FormSelect>
                  ) : null}
                  <Checkbox
                    id={`publish-catalog-addon-operator-${operator.id}`}
                    className="provider-setup-template__addon-operator-checkbox"
                    isChecked={isSelected}
                    isDisabled={isCheckboxDisabled}
                    aria-label={operator.name}
                    onChange={(_event, checked) => {
                      if (isCheckboxDisabled) {
                        return
                      }
                      if (checked) {
                        onSelectionsChange(
                          selectClusterAddonOperator(
                            selections,
                            operator.id,
                            isEditable ? 'optional-default' : 'mandatory',
                          ),
                        )
                        return
                      }
                      onSelectionsChange(
                        deselectClusterAddonOperator(selections, operator.id),
                      )
                    }}
                  />
                </div>
              </div>

              <Content
                component="p"
                className="provider-setup-template__addon-operator-description"
              >
                {operator.description}
              </Content>

              {!isIncompatible && !isExcluded && constraintChips.length > 0 ? (
                <div
                  className="provider-setup-template__addon-operator-constraints"
                  aria-label="Operator constraints"
                >
                  {constraintChips.map((chip) => (
                    <Label
                      key={chip.id}
                      color={chip.color}
                      isCompact
                      className="provider-setup-template__addon-operator-constraint"
                    >
                      {chip.label}
                    </Label>
                  ))}
                </div>
              ) : null}

              {isIncompatible && incompatibilityMessage ? (
                <Alert
                  variant="danger"
                  isInline
                  title={incompatibilityMessage}
                  className="provider-setup-template__addon-operator-incompat-alert"
                  actionLinks={
                    <AlertActionLink
                      component="button"
                      onClick={() => goToStepById('publish-catalog-step-os')}
                    >
                      Change cluster version
                    </AlertActionLink>
                  }
                />
              ) : null}
              {isExcluded && exclusionMessage ? (
                <Alert
                  variant="warning"
                  isInline
                  isPlain
                  title={exclusionMessage}
                  className="provider-setup-template__addon-operator-incompat-alert"
                />
              ) : null}
            </li>
          )
        })}
      </ul>

      {visibleOperators.length === 0 ? (
        <Title headingLevel="h3" size="md">
          No operators match this filter
        </Title>
      ) : null}
    </div>
  )
}
