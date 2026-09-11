import { useEffect, useLayoutEffect, useMemo, useRef, type ReactElement } from 'react'
import {
  action,
  ColaGroupsLayout,
  ContextMenuItem,
  ContextMenuSeparator,
  createTopologyControlButtons,
  DagreLayout,
  defaultControlButtonsOptions,
  DefaultEdge,
  DefaultGroup,
  DefaultNode,
  GRAPH_LAYOUT_END_EVENT,
  GraphComponent,
  ModelKind,
  observer,
  SELECTION_EVENT,
  TopologyControlBar,
  TopologySideBar,
  TopologyView,
  Visualization,
  VisualizationProvider,
  VisualizationSurface,
  withContextMenu,
  withDragNode,
  withPanZoom,
  withSelection,
} from '@patternfly/react-topology'
import type {
  ComponentFactory,
  Graph,
  Layout,
  LayoutFactory,
  Model,
  Node,
  WithContextMenuProps,
  WithDragNodeProps,
  WithSelectionProps,
} from '@patternfly/react-topology'
import { Spinner } from '@patternfly/react-core'
import { FolderOpenIcon } from '@patternfly/react-icons/dist/esm/icons/folder-open-icon'
import { OutlinedFolderIcon } from '@patternfly/react-icons/dist/esm/icons/outlined-folder-icon'
import type { TenantInstance } from '../../tenantUser/instances'
import { buildProjectTopologyModel, PROJECT_TOPOLOGY_DAGRE_OPTIONS } from '../../tenantAdmin/projectTopologyModel'
import { applyStraightProjectEdges } from '../../tenantAdmin/projectTopologyEdges'
import type { TenantProject, TenantProjectActionItem } from '../../tenantAdmin/projects'

const TOPOLOGY_NODE_ICON_COLOR = '#393F44'
const TOPOLOGY_NODE_ICON_SIZE = 25
const TOPOLOGY_NODE_ICON_OFFSET = 25

type TenantProjectTopologyViewProps = {
  projectCatalog: readonly TenantProject[]
  instances: readonly TenantInstance[]
  visibleProjectIds: ReadonlySet<string>
  highlightedProjectIds: ReadonlySet<string>
  getProjectActions: (project: TenantProject) => TenantProjectActionItem[]
  showActions?: boolean
  selectedProjectId?: string | null
  creatingProjectId?: string | null
  onSelectProject?: (project: TenantProject | null) => void
  sideBar?: ReactElement | null
}

type ProjectNodeData = {
  projectId: string
  isRoot?: boolean
  isCreating?: boolean
  isHighlighted: boolean
  secondaryLabel: string
  showActionsMenu: boolean
}

type ProjectTopologyNodeProps = {
  element: Node
} & WithDragNodeProps &
  WithContextMenuProps &
  WithSelectionProps

const topologyActionContext = {
  projectById: new Map<string, TenantProject>(),
  getProjectActions: (_project: TenantProject) => [] as TenantProjectActionItem[],
}

function buildProjectContextMenuItems(
  actions: readonly TenantProjectActionItem[],
): ReactElement[] {
  return actions.flatMap((action, index) => {
    if (action.isSeparator) {
      return [<ContextMenuSeparator component="li" key={`separator-${index}`} />]
    }

    if (!action.title) {
      return []
    }

    return [
      <ContextMenuItem
        key={action.title}
        isDisabled={action.isDisabled}
        onClick={() => {
          action.onClick?.()
        }}
      >
        {action.title}
      </ContextMenuItem>,
    ]
  })
}

const ProjectTopologyNode = observer(
  ({
    element,
    onContextMenu,
    contextMenuOpen,
    selected,
    onSelect,
    ...rest
  }: ProjectTopologyNodeProps) => {
    const data = element.getData() as ProjectNodeData | undefined
    const showActionsMenu = data?.showActionsMenu === true
    const isCreating = data?.isCreating === true
    const NodeIcon = data?.isRoot ? FolderOpenIcon : OutlinedFolderIcon
    const nodeClassName = [
      data?.isHighlighted === false ? 'tenant-project-topology-node--dimmed' : null,
      isCreating ? 'tenant-project-topology-node--creating' : null,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <DefaultNode
        element={element}
        {...rest}
        selected={selected}
        onSelect={onSelect}
        onContextMenu={onContextMenu}
        contextMenuOpen={contextMenuOpen}
        hideContextMenuKebab={!showActionsMenu}
        showLabel
        secondaryLabel={showActionsMenu ? undefined : data?.secondaryLabel}
        truncateLength={showActionsMenu ? 22 : undefined}
        labelClassName="tenant-project-topology-node__label"
        className={nodeClassName || undefined}
      >
        {isCreating ? (
          <foreignObject
            x={TOPOLOGY_NODE_ICON_OFFSET}
            y={TOPOLOGY_NODE_ICON_OFFSET}
            width={TOPOLOGY_NODE_ICON_SIZE}
            height={TOPOLOGY_NODE_ICON_SIZE}
          >
            <div className="tenant-project-topology-node__creating-spinner">
              <Spinner size="md" aria-label="Creating project" />
            </div>
          </foreignObject>
        ) : (
          <g transform={`translate(${TOPOLOGY_NODE_ICON_OFFSET}, ${TOPOLOGY_NODE_ICON_OFFSET})`}>
            <NodeIcon
              aria-hidden
              style={{ color: TOPOLOGY_NODE_ICON_COLOR }}
              width={TOPOLOGY_NODE_ICON_SIZE}
              height={TOPOLOGY_NODE_ICON_SIZE}
            />
          </g>
        )}
      </DefaultNode>
    )
  },
)

const SelectableProjectNode = withSelection()(ProjectTopologyNode)
const DraggableProjectNode = withDragNode()(SelectableProjectNode)

const ProjectNodeWithContextMenu = withContextMenu((element: Node) => {
  const data = element.getData() as ProjectNodeData | undefined
  if (!data?.showActionsMenu) {
    return []
  }

  const project = topologyActionContext.projectById.get(data.projectId)
  if (!project) {
    return []
  }

  return buildProjectContextMenuItems(topologyActionContext.getProjectActions(project))
}, undefined, undefined, false)(DraggableProjectNode)

const TOPOLOGY_FIT_PADDING = 40
const TOPOLOGY_MIN_HEIGHT = 360
const TOPOLOGY_VIEWPORT_BOTTOM_GAP = 16

function getTopologyBottomGap(panel: HTMLDivElement): number {
  let gap = TOPOLOGY_VIEWPORT_BOTTOM_GAP
  const mainSection = panel.closest('.tenant-shell-page__main')

  if (mainSection) {
    gap += Number.parseFloat(getComputedStyle(mainSection).paddingBottom) || 0
  }

  return gap
}

function syncTopologyPanelHeight(panel: HTMLDivElement, controller: Visualization): void {
  const { top } = panel.getBoundingClientRect()
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight
  const bottomGap = getTopologyBottomGap(panel)
  const available = viewportHeight - top - bottomGap
  const height = Math.max(Math.min(available, viewportHeight - bottomGap), TOPOLOGY_MIN_HEIGHT)
  panel.style.height = `${height}px`
  panel.style.minHeight = `${height}px`
  requestAnimationFrame(() => {
    controller.getGraph()?.fit(TOPOLOGY_FIT_PADDING)
  })
}

const topologyLayoutFactory: LayoutFactory = (type: string, graph: Graph): Layout | undefined => {
  switch (type) {
    case 'Dagre':
      return new DagreLayout(graph, PROJECT_TOPOLOGY_DAGRE_OPTIONS)
    case 'ColaGroups':
      return new ColaGroupsLayout(graph, { layoutOnDrag: false })
    default:
      return new DagreLayout(graph, PROJECT_TOPOLOGY_DAGRE_OPTIONS)
  }
}

const topologyComponentFactory: ComponentFactory = (kind, type) => {
  switch (type) {
    case 'group':
      return withSelection()(DefaultGroup)
    default:
      switch (kind) {
        case ModelKind.graph:
          return withPanZoom()(withSelection()(GraphComponent))
        case ModelKind.node:
          return ProjectNodeWithContextMenu as NonNullable<ReturnType<ComponentFactory>>
        case ModelKind.edge:
          return DefaultEdge
        default:
          return undefined
      }
  }
}

type TopologySelectionState = {
  selectedIds?: string[]
}

function resolveSelectedProjectId(
  selectedIds: readonly string[],
  projectById: ReadonlyMap<string, TenantProject>,
): string | null {
  for (const id of selectedIds) {
    if (projectById.has(id)) {
      return id
    }

    if (id.startsWith('group-')) {
      const projectId = id.slice('group-'.length)
      if (projectById.has(projectId)) {
        return projectId
      }
    }
  }

  return null
}

export function TenantProjectTopologyView({
  projectCatalog,
  instances,
  visibleProjectIds,
  highlightedProjectIds,
  getProjectActions,
  showActions = false,
  selectedProjectId = null,
  creatingProjectId = null,
  onSelectProject,
  sideBar = null,
}: TenantProjectTopologyViewProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const onSelectProjectRef = useRef(onSelectProject)
  onSelectProjectRef.current = onSelectProject

  const projectById = useMemo(
    () => new Map(projectCatalog.map((project) => [project.id, project])),
    [projectCatalog],
  )
  const projectByIdRef = useRef(projectById)
  projectByIdRef.current = projectById

  topologyActionContext.projectById = projectById
  topologyActionContext.getProjectActions = getProjectActions

  const model = useMemo(
    () =>
      buildProjectTopologyModel(
        projectCatalog,
        visibleProjectIds,
        highlightedProjectIds,
        instances,
        showActions,
        creatingProjectId,
      ),
    [projectCatalog, visibleProjectIds, highlightedProjectIds, instances, showActions, creatingProjectId],
  )

  const controller = useMemo(() => {
    const visualization = new Visualization()
    visualization.registerLayoutFactory(topologyLayoutFactory)
    visualization.registerComponentFactory(topologyComponentFactory)
    visualization.setFitToScreenOnLayout(true, TOPOLOGY_FIT_PADDING)
    visualization.getState<TopologySelectionState>().selectedIds = []

    visualization.addEventListener(
      GRAPH_LAYOUT_END_EVENT,
      action(() => {
        const graph = visualization.getGraph()
        if (graph) {
          applyStraightProjectEdges(graph)
        }
        graph?.fit(TOPOLOGY_FIT_PADDING)
      }),
    )

    visualization.addEventListener(
      SELECTION_EVENT,
      action((selectedIds: string[]) => {
        const projects = projectByIdRef.current
        const projectId = resolveSelectedProjectId(selectedIds, projects)
        const project = projectId ? projects.get(projectId) ?? null : null
        onSelectProjectRef.current?.(project)
      }),
    )

    return visualization
  }, [])

  useEffect(() => {
    if (model.nodes?.length === 0) {
      return
    }

    controller.fromModel(model as Model, false)
  }, [controller, model])

  useEffect(() => {
    action(() => {
      const state = controller.getState<TopologySelectionState>()
      const nextIds = selectedProjectId ? [selectedProjectId] : []
      const currentIds = state.selectedIds ?? []
      if (
        currentIds.length === nextIds.length &&
        nextIds.every((id, index) => currentIds[index] === id)
      ) {
        return
      }
      state.selectedIds = nextIds
    })()
  }, [controller, selectedProjectId])

  useEffect(() => {
    if (!creatingProjectId || !model.nodes?.length) {
      return
    }

    const fitSelectedNode = action(() => {
      controller.getGraph()?.fit(TOPOLOGY_FIT_PADDING)
    })

    const timer = window.setTimeout(fitSelectedNode, 120)
    return () => {
      window.clearTimeout(timer)
    }
  }, [controller, creatingProjectId, model])

  const isSideBarOpen = Boolean(sideBar && selectedProjectId)

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel || !model.nodes?.length) {
      return
    }

    const updatePanelLayout = () => {
      syncTopologyPanelHeight(panel, controller)
    }

    updatePanelLayout()

    window.addEventListener('resize', updatePanelLayout)
    window.visualViewport?.addEventListener('resize', updatePanelLayout)
    window.visualViewport?.addEventListener('scroll', updatePanelLayout)

    const observer = new ResizeObserver(updatePanelLayout)
    observer.observe(panel)

    const mainSection = panel.closest('.tenant-shell-page__main')
    if (mainSection) {
      observer.observe(mainSection)
    }

    return () => {
      window.removeEventListener('resize', updatePanelLayout)
      window.visualViewport?.removeEventListener('resize', updatePanelLayout)
      window.visualViewport?.removeEventListener('scroll', updatePanelLayout)
      observer.disconnect()
    }
  }, [controller, model, isSideBarOpen])

  if (!model.nodes?.length) {
    return null
  }

  return (
    <div ref={panelRef} className="tenant-project-topology-panel">
      <TopologyView
        className="tenant-project-topology-view"
        sideBar={
          <TopologySideBar
            show={isSideBarOpen}
            onClose={() => {
              onSelectProject?.(null)
            }}
          >
            {sideBar}
          </TopologySideBar>
        }
        sideBarOpen={isSideBarOpen}
        controlBar={
          <TopologyControlBar
            controlButtons={createTopologyControlButtons({
              ...defaultControlButtonsOptions,
              zoomInCallback: action(() => {
                controller.getGraph().scaleBy(4 / 3)
              }),
              zoomOutCallback: action(() => {
                controller.getGraph().scaleBy(0.75)
              }),
              fitToScreenCallback: action(() => {
                controller.getGraph().fit(TOPOLOGY_FIT_PADDING)
              }),
              resetViewCallback: action(() => {
                controller.getGraph().reset()
                controller.getGraph().layout()
              }),
              legend: false,
            })}
          />
        }
      >
        <VisualizationProvider controller={controller}>
          <VisualizationSurface />
        </VisualizationProvider>
      </TopologyView>
    </div>
  )
}
