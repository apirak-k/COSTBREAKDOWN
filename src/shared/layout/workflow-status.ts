export type WorkflowDestination = 'master' | 'breakdown'

export interface WorkflowStatusInput {
  selectedComparisonActive: boolean
  productMismatch: boolean
  missingData: boolean
  datasetsPrepared: boolean
}

export interface WorkflowStatus {
  label: string
  destination: WorkflowDestination
  actionLabel: string
}

export function resolveWorkflowStatus(input: WorkflowStatusInput): WorkflowStatus {
  if (input.selectedComparisonActive) {
    return {
      label: 'Selected Comparison Mode',
      destination: 'breakdown',
      actionLabel: 'Review Cost Breakdown'
    }
  }

  if (input.productMismatch) {
    return {
      label: 'Product Mismatch',
      destination: 'master',
      actionLabel: 'Review Master Data'
    }
  }

  if (input.missingData) {
    return {
      label: 'Missing Data',
      destination: 'master',
      actionLabel: 'Review Master Data'
    }
  }

  if (input.datasetsPrepared) {
    return {
      label: 'Ready for comparison',
      destination: 'breakdown',
      actionLabel: 'Open Cost Breakdown'
    }
  }

  return {
    label: 'Preparation Incomplete',
    destination: 'master',
    actionLabel: 'Review Master Data'
  }
}
