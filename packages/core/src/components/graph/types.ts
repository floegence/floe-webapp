import type { InfiniteCanvasPoint } from '../ui/InfiniteCanvas';

export interface GraphPoint {
  x: number;
  y: number;
}
export interface GraphBounds extends GraphPoint {
  width: number;
  height: number;
}
export type GraphViewport = InfiniteCanvasPoint;

/** Port IDs, node IDs, and edge IDs share one namespace. */
export interface GraphPort {
  id: string;
  side: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';
}

export interface GraphNode {
  id: string;
  label: string;
  kind?: 'node' | 'group';
  parentId?: string;
  width: number;
  height: number;
  ports?: readonly GraphPort[];
}

export interface GraphEdge {
  id: string;
  label: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
}

export interface GraphInput {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
}

export interface GraphLayoutNode extends GraphNode, GraphBounds {}
export interface GraphLayoutEdge extends GraphEdge {
  /** Separate sections preserve branches and self loops without inventing joins. */
  sections: readonly (readonly GraphPoint[])[];
}

export interface GraphLayout {
  nodes: readonly GraphLayoutNode[];
  edges: readonly GraphLayoutEdge[];
  bounds: GraphBounds;
}

export interface GraphLayoutOptions {
  /** Clearance around routing obstacles in world units. Defaults to 4; never changes node geometry. */
  edgeClearance?: number;
  /** Desired width/height when packing disconnected objects, including group members. */
  aspectRatio?: number;
  /** Absolute world positions. Descendants move with their group. Invalid positions always fail. */
  positions?: readonly (GraphPoint & { nodeId: string })[];
  /** Root-level ranks. Unassigned roots are placed deterministically near their closest ranked neighbors. */
  layers?: readonly (readonly string[])[];
  /** Fixed (default) rejects impossible geometry. Preferred retains positions; compact uses them only as stable ordering hints. */
  positionMode?: 'fixed' | 'preferred' | 'compact';
  direction?: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP';
  spacing?: number;
  groupPadding?: { top: number; right: number; bottom: number; left: number };
  /** Keep the object under inspection at its previous world position after layout. */
  anchor?: { nodeId: string; position: GraphPoint };
}

export type GraphObjectRef = { kind: 'node' | 'edge'; id: string };

/** Client coordinates go directly to SurfaceFloatingLayer; never rescale them. */
export interface GraphObjectEvent {
  object: GraphObjectRef | null;
  position: GraphPoint;
  owner: Element;
}
