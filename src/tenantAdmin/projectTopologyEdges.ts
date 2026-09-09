import type { Graph } from '@patternfly/react-topology'

/** Replace Dagre orthogonal routing with direct anchor-to-anchor edges. */
export function applyStraightProjectEdges(graph: Graph): void {
  for (const edge of graph.getEdges()) {
    edge.setBendpoints([])
  }
}
