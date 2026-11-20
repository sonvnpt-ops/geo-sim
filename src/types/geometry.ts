export type WorkspaceMode = '2d' | '3d';
export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type Geo2DKind =
  | 'point2d'
  | 'segment2d'
  | 'line2d'
  | 'ray2d'
  | 'angle2d'
  | 'circle2d'
  | 'triangle'
  | 'right_triangle'
  | 'isosceles_triangle'
  | 'equilateral_triangle'
  | 'square'
  | 'rectangle'
  | 'trapezoid'
  | 'right_trapezoid'
  | 'isosceles_trapezoid'
  | 'parallelogram'
  | 'rhombus'
  | 'custom_polygon';

export interface Geo2DObject {
  id: string;
  name: string;
  kind: Geo2DKind;
  color: string;
  opacity: number;
  visible: boolean;
  showLabels: boolean;
  autoIntersect: boolean;
  /** Vertices in 2D world coordinates */
  points: Vec2[];
  /** Vertex labels e.g. ['A', 'B', 'C'] */
  pointLabels: string[];
  /** For circle2d: radius */
  radius?: number;
}

export type Geo3DKind =
  | 'point3d'
  | 'line3d'
  | 'plane3d'
  | 'pyramid_tri'
  | 'pyramid_quad'
  | 'tetrahedron'
  | 'cube'
  | 'box'
  | 'prism_right'
  | 'prism_oblique'
  | 'cylinder'
  | 'cone'
  | 'sphere';

export interface Geo3DDimensions {
  width: number;   // base width / edge a
  height: number;  // height h
  depth: number;   // base depth b
  radius: number;  // radius r
  skewX: number;   // oblique prism skew offset
  planeSize: number; // visual span of plane grid
}

export interface Geo3DObject {
  id: string;
  name: string;
  kind: Geo3DKind;
  color: string;
  opacity: number;
  visible: boolean;
  showLabels: boolean;
  autoIntersect: boolean;
  position: Vec3;
  /** Euler rotation in radians (XYZ) */
  rotation: Vec3;
  scale: Vec3;
  dimensions: Geo3DDimensions;
  /** Custom vertex label prefix/list */
  vertexLabels: string[];
}

export interface IntersectionPoint2D {
  id: string;
  point: Vec2;
  sources: [string, string];
}

export interface IntersectionRegion2D {
  id: string;
  triangles: [Vec2, Vec2, Vec2][];
  boundaryEdges: [Vec2, Vec2][];
  area: number;
  sources: [string, string];
}

export interface Intersection2DSummary {
  points: IntersectionPoint2D[];
  regions: IntersectionRegion2D[];
}

export interface CrossSection3DResult {
  id: string;
  planeId: string;
  planeName: string;
  solidId: string;
  solidName: string;
  loops: Vec3[][];
  /** Triangulated positions in world space (flat array x,y,z) */
  trianglePositions: number[];
  area: number;
  vertexCount: number;
  shapeLabel: string;
}

export interface PlanePlaneIntersection3D {
  id: string;
  plane1Id: string;
  plane1Name: string;
  plane2Id: string;
  plane2Name: string;
  start: Vec3;
  end: Vec3;
  origin: Vec3;
  direction: Vec3;
}

export interface LineIntersection3D {
  id: string;
  lineId: string;
  lineName: string;
  targetId: string;
  targetName: string;
  points: Vec3[];
  interiorSegments: [Vec3, Vec3][];
}

export interface SolidSolidIntersection3D {
  id: string;
  solid1Id: string;
  solid1Name: string;
  solid2Id: string;
  solid2Name: string;
  segments: [Vec3, Vec3][];
}

export interface Intersection3DSummary {
  crossSections: CrossSection3DResult[];
  planeLines: PlanePlaneIntersection3D[];
  lineHits: LineIntersection3D[];
  solidSeams: SolidSolidIntersection3D[];
}

export const SHAPE_COLORS = [
  '#0284C7', // Azure Blue
  '#059669', // Emerald
  '#D97706', // Amber
  '#7C3AED', // Violet
  '#0891B2', // Cyan
  '#4F46E5', // Indigo
  '#DB2777', // Rose
  '#475569', // Slate
];
