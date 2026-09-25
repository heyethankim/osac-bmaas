import { Content, Label } from '@patternfly/react-core'
import {
  DEMO_PROJECT_BUDGET_REMAINING_USD,
  formatLaunchCostEstimate,
} from '../../billing/m360'

type LaunchCostPanelProps = {
  hourlyEstimate: number | null
  projectName?: string
}

export function LaunchCostPanel({ hourlyEstimate, projectName }: LaunchCostPanelProps) {
  const estimateLabel = formatLaunchCostEstimate(hourlyEstimate)
  const budgetLabel = projectName?.trim()
    ? `${projectName.trim()} · Budget remaining: $${DEMO_PROJECT_BUDGET_REMAINING_USD.toFixed(2)}`
    : `Project budget remaining: $${DEMO_PROJECT_BUDGET_REMAINING_USD.toFixed(2)}`

  return (
    <div className="billing-launch-cost-panel" aria-label="Estimated launch cost">
      <div className="billing-launch-cost-panel__estimate">
        <Content component="p" className="billing-launch-cost-panel__label">
          Estimated cost
        </Content>
        <Content component="p" className="billing-launch-cost-panel__value">
          {estimateLabel}
        </Content>
      </div>
      <div className="billing-launch-cost-panel__budget">
        <Label color="blue" isCompact>
          {budgetLabel}
        </Label>
      </div>
    </div>
  )
}
