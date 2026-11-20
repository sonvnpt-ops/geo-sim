import * as THREE from 'three';
import {
  CrossSection3DResult,
  Geo3DDimensions,
  Geo3DKind,
  Geo3DObject,
  Intersection3DSummary,
  LineIntersection3D,
  PlanePlaneIntersection3D,
  SHAPE_COLORS,
  SolidSolidIntersection3D,
  Vec3,
} from '../types/geometry';

const EPS = 1e-5;

const KIND_NAMES_3D_VI: Record<Geo3DKind, string> = {
  point3d: 'Điểm trong không gian',
  line3d: 'Đường thẳng',
  plane3d: 'Mặt phẳng',
  pyramid_tri: 'Hình chóp tam giác',
  pyramid_quad: 'Hình chóp tứ giác đều',
  tetrahedron: 'Tứ diện đều',
  cube: 'Hình lập phương',
  box: 'Hình hộp chữ nhật',
  prism_right: 'Hình lăng trụ đứng',
  prism_oblique: 'Hình lăng trụ xiên',
  cylinder: 'Hình trụ',
  cone: 'Hình nón',
  sphere: 'Hình cầu',
};

export function get3DKindLabel(kind: Geo3DKind): string {
  return KIND_NAMES_3D_VI[kind];
}

export function is3DSolidKind(kind: Geo3DKind): boolean {
  return kind !== 'point3d' && kind !== 'line3d' && kind !== 'plane3d';
}

export function makeDefault3DObject(
  kind: Geo3DKind,
  existingCount: number,
  customDims: Partial<Geo3DDimensions> = {},
  customPos?: Vec3,
  customRot?: Vec3,
): Geo3DObject {
  const id = `obj3d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const color =
    kind === 'plane3d'
      ? '#0EA5E9'
      : kind === 'line3d'
        ? '#7C3AED'
        : SHAPE_COLORS[existingCount % SHAPE_COLORS.length];

  const dims: Geo3DDimensions = {
    width: customDims.width ?? 3.2,
    height: customDims.height ?? 3.6,
    depth: customDims.depth ?? 2.6,
    radius: customDims.radius ?? 1.6,
    skewX: customDims.skewX ?? 1.1,
    planeSize: customDims.planeSize ?? 8.0,
  };

  let name = `${KIND_NAMES_3D_VI[kind]} ${existingCount + 1}`;
  let vertexLabels: string[] = [];
  let position: Vec3 = customPos ?? { x: 0, y: 0, z: 0 };
  let rotation: Vec3 = customRot ?? { x: 0, y: 0, z: 0 };

  if (kind === 'point3d') {
    const idx = existingCount % 26;
    const ch = String.fromCharCode(65 + idx);
    name = `Điểm ${ch}`;
    vertexLabels = [ch];
    if (!customPos) position = { x: 1.2, y: 2.0, z: 0.8 };
  } else if (kind === 'line3d') {
    name = `Đường thẳng d${existingCount > 0 ? existingCount + 1 : ''}`;
    if (!customPos) position = { x: 0, y: 1.8, z: 0 };
    if (!customRot) rotation = { x: 0.35, y: 0.2, z: 0.9 };
  } else if (kind === 'plane3d') {
    const planeNames = ['(P)', '(Q)', '(R)', '(α)', '(β)'];
    const pName = planeNames[existingCount % planeNames.length];
    name = `Mặt phẳng ${pName}`;
    if (!customPos) position = { x: 0, y: 1.6, z: 0 };
    if (!customRot) rotation = { x: 0.28, y: 0.12, z: 0.18 };
  } else if (kind === 'pyramid_tri') {
    name = 'Hình chóp S.ABC';
    vertexLabels = ['A', 'B', 'C', 'S'];
  } else if (kind === 'pyramid_quad') {
    name = 'Hình chóp S.ABCD';
    vertexLabels = ['A', 'B', 'C', 'D', 'S'];
  } else if (kind === 'tetrahedron') {
    name = 'Tứ diện đều A.BCD';
    vertexLabels = ['B', 'C', 'D', 'A'];
  } else if (kind === 'cube') {
    name = 'Hình lập phương ABCD.A\'B\'C\'D\'';
    vertexLabels = ['A', 'B', 'C', 'D', 'A\'', 'B\'', 'C\'', 'D\''];
  } else if (kind === 'box') {
    name = 'Hình hộp chữ nhật';
    vertexLabels = ['A', 'B', 'C', 'D', 'A\'', 'B\'', 'C\'', 'D\''];
  } else if (kind === 'prism_right') {
    name = 'Lăng trụ đứng ABC.A\'B\'C\'';
    vertexLabels = ['A', 'B', 'C', 'A\'', 'B\'', 'C\''];
  } else if (kind === 'prism_oblique') {
    name = 'Lăng trụ xiên ABC.A\'B\'C\'';
    vertexLabels = ['A', 'B', 'C', 'A\'', 'B\'', 'C\''];
  }

  return {
    id,
    name,
    kind,
    color,
    opacity: kind === 'plane3d' ? 0.32 : 0.58,
    visible: true,
    showLabels: true,
    autoIntersect: true,
    position,
    rotation,
    scale: { x: 1, y: 1, z: 1 },
    dimensions: dims,
    vertexLabels,
  };
}

export interface SolidMeshBuildResult {
  geometry: THREE.BufferGeometry;
  edgeGeometry: THREE.BufferGeometry;
  vertices: { label: string; localPos: THREE.Vector3 }[];
  isPolyhedron: boolean;
  polyEdges: [THREE.Vector3, THREE.Vector3][];
}

function buildPolyhedronData(
  rawVerts: Vec3[],
  faces: number[][],
  edges: [number, number][],
  labels: string[],
): SolidMeshBuildResult {
  const verts = rawVerts.map((v) => new THREE.Vector3(v.x, v.y, v.z));
  const positions: number[] = [];

  for (const face of faces) {
    if (face.length < 3) continue;
    const v0 = verts[face[0]];
    for (let i = 1; i < face.length - 1; i++) {
      const v1 = verts[face[i]];
      const v2 = verts[face[i + 1]];
      positions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  const edgePos: number[] = [];
  const polyEdges: [THREE.Vector3, THREE.Vector3][] = [];
  for (const [ia, ib] of edges) {
    const a = verts[ia];
    const b = verts[ib];
    edgePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    polyEdges.push([a.clone(), b.clone()]);
  }
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));

  const namedVertices = verts.map((v, i) => ({
    label: labels[i] ?? `V${i + 1}`,
    localPos: v,
  }));

  return {
    geometry,
    edgeGeometry,
    vertices: namedVertices,
    isPolyhedron: true,
    polyEdges,
  };
}

export function buildSolidGeometry(obj: Geo3DObject): SolidMeshBuildResult {
  const { width: w, height: h, depth: d, radius: r, skewX } = obj.dimensions;
  const labels = obj.vertexLabels;

  switch (obj.kind) {
    case 'pyramid_tri': {
      const rad = w * 0.62;
      const verts: Vec3[] = [
        { x: rad * Math.cos(-Math.PI / 6), y: 0, z: rad * Math.sin(-Math.PI / 6) },
        { x: rad * Math.cos(Math.PI / 2), y: 0, z: rad * Math.sin(Math.PI / 2) },
        { x: rad * Math.cos((7 * Math.PI) / 6), y: 0, z: rad * Math.sin((7 * Math.PI) / 6) },
        { x: 0.15, y: h, z: -0.1 },
      ];
      // Outward winding: base faces down (-Y), sides face outward
      const faces = [
        [0, 1, 2],
        [0, 3, 1],
        [1, 3, 2],
        [2, 3, 0],
      ];
      const edges: [number, number][] = [
        [0, 1], [1, 2], [2, 0],
        [0, 3], [1, 3], [2, 3],
      ];
      return buildPolyhedronData(verts, faces, edges, labels);
    }

    case 'tetrahedron': {
      const a = w;
      const circumR = a / Math.sqrt(3);
      const tetH = a * Math.sqrt(2 / 3);
      const verts: Vec3[] = [
        { x: circumR * Math.cos(-Math.PI / 6), y: 0, z: circumR * Math.sin(-Math.PI / 6) },
        { x: circumR * Math.cos(Math.PI / 2), y: 0, z: circumR * Math.sin(Math.PI / 2) },
        { x: circumR * Math.cos((7 * Math.PI) / 6), y: 0, z: circumR * Math.sin((7 * Math.PI) / 6) },
        { x: 0, y: tetH, z: 0 },
      ];
      const faces = [
        [0, 1, 2],
        [0, 3, 1],
        [1, 3, 2],
        [2, 3, 0],
      ];
      const edges: [number, number][] = [
        [0, 1], [1, 2], [2, 0],
        [0, 3], [1, 3], [2, 3],
      ];
      return buildPolyhedronData(verts, faces, edges, labels);
    }

    case 'pyramid_quad': {
      const hw = w / 2;
      const hd = w / 2;
      const verts: Vec3[] = [
        { x: -hw, y: 0, z: -hd },
        { x: hw, y: 0, z: -hd },
        { x: hw, y: 0, z: hd },
        { x: -hw, y: 0, z: hd },
        { x: 0, y: h, z: 0 },
      ];
      const faces = [
        [0, 1, 2, 3],
        [0, 4, 1],
        [1, 4, 2],
        [2, 4, 3],
        [3, 4, 0],
      ];
      const edges: [number, number][] = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [0, 4], [1, 4], [2, 4], [3, 4],
      ];
      return buildPolyhedronData(verts, faces, edges, labels);
    }

    case 'cube':
    case 'box': {
      const hw = w / 2;
      const hd = (obj.kind === 'cube' ? w : d) / 2;
      const bh = obj.kind === 'cube' ? w : h;
      const verts: Vec3[] = [
        { x: -hw, y: 0, z: hd },
        { x: hw, y: 0, z: hd },
        { x: hw, y: 0, z: -hd },
        { x: -hw, y: 0, z: -hd },
        { x: -hw, y: bh, z: hd },
        { x: hw, y: bh, z: hd },
        { x: hw, y: bh, z: -hd },
        { x: -hw, y: bh, z: -hd },
      ];
      const faces = [
        [0, 3, 2, 1], // bottom (-Y)
        [4, 5, 6, 7], // top (+Y)
        [0, 1, 5, 4], // front (+Z)
        [1, 2, 6, 5], // right (+X)
        [2, 3, 7, 6], // back (-Z)
        [3, 0, 4, 7], // left (-X)
      ];
      const edges: [number, number][] = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7],
      ];
      return buildPolyhedronData(verts, faces, edges, labels);
    }

    case 'prism_right':
    case 'prism_oblique': {
      const rad = w * 0.58;
      const sx = obj.kind === 'prism_oblique' ? skewX : 0;
      const sz = obj.kind === 'prism_oblique' ? skewX * 0.45 : 0;
      const b0 = { x: rad * Math.cos(-Math.PI / 6), y: 0, z: rad * Math.sin(-Math.PI / 6) };
      const b1 = { x: rad * Math.cos(Math.PI / 2), y: 0, z: rad * Math.sin(Math.PI / 2) };
      const b2 = { x: rad * Math.cos((7 * Math.PI) / 6), y: 0, z: rad * Math.sin((7 * Math.PI) / 6) };
      const verts: Vec3[] = [
        b0,
        b1,
        b2,
        { x: b0.x + sx, y: h, z: b0.z + sz },
        { x: b1.x + sx, y: h, z: b1.z + sz },
        { x: b2.x + sx, y: h, z: b2.z + sz },
      ];
      const faces = [
        [0, 1, 2],
        [3, 5, 4],
        [0, 3, 4, 1],
        [1, 4, 5, 2],
        [2, 5, 3, 0],
      ];
      const edges: [number, number][] = [
        [0, 1], [1, 2], [2, 0],
        [3, 4], [4, 5], [5, 3],
        [0, 3], [1, 4], [2, 5],
      ];
      return buildPolyhedronData(verts, faces, edges, labels);
    }

    case 'cylinder': {
      const geo = new THREE.CylinderGeometry(r, r, h, 48, 1, false);
      geo.translate(0, h / 2, 0);
      const nonIdx = geo.toNonIndexed();
      nonIdx.computeVertexNormals();
      const edgeGeo = new THREE.EdgesGeometry(geo, 25);
      geo.dispose();
      return {
        geometry: nonIdx,
        edgeGeometry: edgeGeo,
        vertices: [
          { label: 'O', localPos: new THREE.Vector3(0, 0, 0) },
          { label: 'O\'', localPos: new THREE.Vector3(0, h, 0) },
        ],
        isPolyhedron: false,
        polyEdges: [],
      };
    }

    case 'cone': {
      const geo = new THREE.ConeGeometry(r, h, 48, 1, false);
      geo.translate(0, h / 2, 0);
      const nonIdx = geo.toNonIndexed();
      nonIdx.computeVertexNormals();
      const edgeGeo = new THREE.EdgesGeometry(geo, 25);
      geo.dispose();
      return {
        geometry: nonIdx,
        edgeGeometry: edgeGeo,
        vertices: [
          { label: 'O', localPos: new THREE.Vector3(0, 0, 0) },
          { label: 'S', localPos: new THREE.Vector3(0, h, 0) },
        ],
        isPolyhedron: false,
        polyEdges: [],
      };
    }

    case 'sphere':
    default: {
      const geo = new THREE.SphereGeometry(r, 36, 24);
      geo.translate(0, r, 0);
      const nonIdx = geo.toNonIndexed();
      nonIdx.computeVertexNormals();
      // Build equator + prime meridian rings for crisp 3D depth cue
      const ringPos: number[] = [];
      const segs = 48;
      for (let i = 0; i < segs; i++) {
        const a1 = (i / segs) * Math.PI * 2;
        const a2 = ((i + 1) / segs) * Math.PI * 2;
        ringPos.push(
          r * Math.cos(a1), r, r * Math.sin(a1),
          r * Math.cos(a2), r, r * Math.sin(a2),
          r * Math.cos(a1), r + r * Math.sin(a1), 0,
          r * Math.cos(a2), r + r * Math.sin(a2), 0,
          0, r + r * Math.sin(a1), r * Math.cos(a1),
          0, r + r * Math.sin(a2), r * Math.cos(a2),
        );
      }
      const edgeGeo = new THREE.BufferGeometry();
      edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(ringPos, 3));
      geo.dispose();
      return {
        geometry: nonIdx,
        edgeGeometry: edgeGeo,
        vertices: [{ label: 'I', localPos: new THREE.Vector3(0, r, 0) }],
        isPolyhedron: false,
        polyEdges: [],
      };
    }
  }
}

export function getObjectMatrixWorld(obj: Geo3DObject): THREE.Matrix4 {
  const pos = new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z);
  const euler = new THREE.Euler(obj.rotation.x, obj.rotation.y, obj.rotation.z, 'XYZ');
  const quat = new THREE.Quaternion().setFromEuler(euler);
  const scale = new THREE.Vector3(obj.scale.x, obj.scale.y, obj.scale.z);
  return new THREE.Matrix4().compose(pos, quat, scale);
}

export function getPlaneData(obj: Geo3DObject): {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  uAxis: THREE.Vector3;
  vAxis: THREE.Vector3;
  constant: number;
} {
  const mat = getObjectMatrixWorld(obj);
  const point = new THREE.Vector3(0, 0, 0).applyMatrix4(mat);
  const normalMat = new THREE.Matrix3().getNormalMatrix(mat);
  const normal = new THREE.Vector3(0, 1, 0).applyMatrix3(normalMat).normalize();
  const uAxis = new THREE.Vector3(1, 0, 0).applyMatrix3(normalMat).normalize();
  const vAxis = new THREE.Vector3().crossVectors(normal, uAxis).normalize();
  const constant = normal.dot(point);
  return { point, normal, uAxis, vAxis, constant };
}

// ---------------- Cross-Section Slicer (Plane ∩ Solid) ----------------

function polygonArea2DSigned(pts: THREE.Vector2[]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    sum += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return sum * 0.5;
}

function simplifyCollinear2D(pts: THREE.Vector2[]): THREE.Vector2[] {
  if (pts.length <= 3) return pts;
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const curr = pts[i];
    const next = pts[(i + 1) % pts.length];
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const l1 = Math.hypot(v1x, v1y);
    const l2 = Math.hypot(v2x, v2y);
    if (l1 < 1e-4 || l2 < 1e-4) continue;
    const cross = Math.abs(v1x * v2y - v1y * v2x) / (l1 * l2);
    if (cross > 0.008) {
      out.push(curr);
    }
  }
  return out.length >= 3 ? out : pts;
}

function classifyCrossSectionShape(
  solidKind: Geo3DKind,
  loop2D: THREE.Vector2[],
  isPolyhedron: boolean,
): { vertexCount: number; shapeLabel: string } {
  if (!isPolyhedron) {
    if (solidKind === 'sphere') {
      return { vertexCount: loop2D.length, shapeLabel: 'Hình tròn' };
    }
    if (solidKind === 'cylinder') {
      if (loop2D.length <= 6) {
        return { vertexCount: loop2D.length, shapeLabel: 'Hình chữ nhật' };
      }
      // Check circularity
      const cx = loop2D.reduce((s, p) => s + p.x, 0) / loop2D.length;
      const cy = loop2D.reduce((s, p) => s + p.y, 0) / loop2D.length;
      const radii = loop2D.map((p) => Math.hypot(p.x - cx, p.y - cy));
      const minR = Math.min(...radii);
      const maxR = Math.max(...radii);
      if (maxR - minR < 0.04 * maxR) {
        return { vertexCount: loop2D.length, shapeLabel: 'Hình tròn' };
      }
      return { vertexCount: loop2D.length, shapeLabel: 'Hình elip' };
    }
    if (solidKind === 'cone') {
      if (loop2D.length <= 4) {
        return { vertexCount: loop2D.length, shapeLabel: 'Tam giác' };
      }
      const cx = loop2D.reduce((s, p) => s + p.x, 0) / loop2D.length;
      const cy = loop2D.reduce((s, p) => s + p.y, 0) / loop2D.length;
      const radii = loop2D.map((p) => Math.hypot(p.x - cx, p.y - cy));
      const minR = Math.min(...radii);
      const maxR = Math.max(...radii);
      if (maxR - minR < 0.04 * maxR) {
        return { vertexCount: loop2D.length, shapeLabel: 'Hình tròn' };
      }
      return { vertexCount: loop2D.length, shapeLabel: 'Thiết diện Elip / Conic' };
    }
  }

  const n = loop2D.length;
  if (n === 3) return { vertexCount: 3, shapeLabel: 'Tam giác' };
  if (n === 4) {
    const e0 = loop2D[1].clone().sub(loop2D[0]);
    const e1 = loop2D[2].clone().sub(loop2D[1]);
    const e2 = loop2D[3].clone().sub(loop2D[2]);
    const e3 = loop2D[0].clone().sub(loop2D[3]);
    const parallel02 = Math.abs(e0.clone().normalize().cross(e2.clone().normalize())) < 0.03;
    const parallel13 = Math.abs(e1.clone().normalize().cross(e3.clone().normalize())) < 0.03;
    if (parallel02 && parallel13) {
      const rightAngle = Math.abs(e0.clone().normalize().dot(e1.clone().normalize())) < 0.03;
      const eqAdj = Math.abs(e0.length() - e1.length()) < 0.05;
      if (rightAngle && eqAdj) return { vertexCount: 4, shapeLabel: 'Hình vuông' };
      if (rightAngle) return { vertexCount: 4, shapeLabel: 'Hình chữ nhật' };
      if (eqAdj) return { vertexCount: 4, shapeLabel: 'Hình thoi' };
      return { vertexCount: 4, shapeLabel: 'Hình bình hành' };
    }
    if (parallel02 || parallel13) {
      return { vertexCount: 4, shapeLabel: 'Hình thang' };
    }
    return { vertexCount: 4, shapeLabel: 'Tứ giác' };
  }
  if (n === 5) return { vertexCount: 5, shapeLabel: 'Ngũ giác' };
  if (n === 6) return { vertexCount: 6, shapeLabel: 'Lục giác' };
  return { vertexCount: n, shapeLabel: `Đa giác ${n} cạnh` };
}

function triangulateAndPack(
  loops3D: THREE.Vector3[][],
  planeOrigin: THREE.Vector3,
  uAxis: THREE.Vector3,
  vAxis: THREE.Vector3,
): { trianglePositions: number[]; area: number; loops2D: THREE.Vector2[][] } {
  let totalArea = 0;
  const trianglePositions: number[] = [];
  const loops2D: THREE.Vector2[][] = [];

  for (const loop3D of loops3D) {
    if (loop3D.length < 3) continue;
    const pts2D = loop3D.map((p) => {
      const rel = p.clone().sub(planeOrigin);
      return new THREE.Vector2(rel.dot(uAxis), rel.dot(vAxis));
    });
    const signed = polygonArea2DSigned(pts2D);
    if (Math.abs(signed) < 1e-4) continue;

    // Ensure CCW
    const ordered3D = signed < 0 ? [...loop3D].reverse() : loop3D;
    const ordered2D = signed < 0 ? [...pts2D].reverse() : pts2D;
    totalArea += Math.abs(signed);
    loops2D.push(ordered2D);

    const indices = THREE.ShapeUtils.triangulateShape(ordered2D, []);
    for (const [ia, ib, ic] of indices) {
      const a = ordered3D[ia];
      const b = ordered3D[ib];
      const c = ordered3D[ic];
      trianglePositions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    }
  }

  return { trianglePositions, area: totalArea, loops2D };
}

function sliceSolidWithPlane(
  planeObj: Geo3DObject,
  solidObj: Geo3DObject,
  solidMesh: SolidMeshBuildResult,
): CrossSection3DResult | null {
  const { point: pOrigin, normal: pNormal, uAxis, vAxis, constant } = getPlaneData(planeObj);
  const solidMatrix = getObjectMatrixWorld(solidObj);

  // Fast Polyhedron Path (exact convex edge slicing + polar sort)
  if (solidMesh.isPolyhedron) {
    const worldHits: THREE.Vector3[] = [];
    const addUnique = (pt: THREE.Vector3) => {
      for (const h of worldHits) {
        if (h.distanceToSquared(pt) < 1e-6) return;
      }
      worldHits.push(pt);
    };

    for (const [la, lb] of solidMesh.polyEdges) {
      const a = la.clone().applyMatrix4(solidMatrix);
      const b = lb.clone().applyMatrix4(solidMatrix);
      const da = pNormal.dot(a) - constant;
      const db = pNormal.dot(b) - constant;

      if (Math.abs(da) < 1e-4 && Math.abs(db) < 1e-4) {
        addUnique(a);
        addUnique(b);
      } else if (Math.abs(da) < 1e-4) {
        addUnique(a);
      } else if (Math.abs(db) < 1e-4) {
        addUnique(b);
      } else if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
        const t = da / (da - db);
        addUnique(a.clone().lerp(b, t));
      }
    }

    if (worldHits.length < 3) return null;

    // Project to 2D and sort by polar angle around centroid
    const proj = worldHits.map((w) => {
      const rel = w.clone().sub(pOrigin);
      return { w, u: rel.dot(uAxis), v: rel.dot(vAxis) };
    });
    const cu = proj.reduce((s, p) => s + p.u, 0) / proj.length;
    const cv = proj.reduce((s, p) => s + p.v, 0) / proj.length;
    proj.sort((a, b) => Math.atan2(a.v - cv, a.u - cu) - Math.atan2(b.v - cv, b.u - cu));

    // Simplify collinear points on 2D loop
    const raw2D = proj.map((p) => new THREE.Vector2(p.u, p.v));
    const simp2D = simplifyCollinear2D(raw2D);
    const ordered3D = simp2D.map((p2) =>
      pOrigin.clone().addScaledVector(uAxis, p2.x).addScaledVector(vAxis, p2.y),
    );

    const { trianglePositions, area, loops2D } = triangulateAndPack(
      [ordered3D],
      pOrigin,
      uAxis,
      vAxis,
    );
    if (area < 1e-4 || trianglePositions.length === 0) return null;

    const { vertexCount, shapeLabel } = classifyCrossSectionShape(
      solidObj.kind,
      loops2D[0],
      true,
    );

    return {
      id: `cs_${planeObj.id}_${solidObj.id}`,
      planeId: planeObj.id,
      planeName: planeObj.name,
      solidId: solidObj.id,
      solidName: solidObj.name,
      loops: [ordered3D.map((v) => ({ x: v.x, y: v.y, z: v.z }))],
      trianglePositions,
      area,
      vertexCount,
      shapeLabel,
    };
  }

  // General Triangle-Mesh Slicer for Round Solids (Cylinder, Cone, Sphere)
  const posAttr = solidMesh.geometry.getAttribute('position');
  if (!posAttr) return null;

  interface DirectedSeg {
    a: THREE.Vector3;
    b: THREE.Vector3;
    used: boolean;
  }

  const segments: DirectedSeg[] = [];
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const triNormal = new THREE.Vector3();

  for (let i = 0; i < posAttr.count; i += 3) {
    va.fromBufferAttribute(posAttr, i).applyMatrix4(solidMatrix);
    vb.fromBufferAttribute(posAttr, i + 1).applyMatrix4(solidMatrix);
    vc.fromBufferAttribute(posAttr, i + 2).applyMatrix4(solidMatrix);

    const da = pNormal.dot(va) - constant;
    const db = pNormal.dot(vb) - constant;
    const dc = pNormal.dot(vc) - constant;

    // Slight nudge to avoid exact-vertex degeneracy
    const epsD = 1e-5;
    const sa = Math.abs(da) < epsD ? epsD : da;
    const sb = Math.abs(db) < epsD ? epsD : db;
    const sc = Math.abs(dc) < epsD ? epsD : dc;

    const hits: THREE.Vector3[] = [];
    const checkEdge = (p1: THREE.Vector3, p2: THREE.Vector3, d1: number, d2: number) => {
      if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) {
        const t = d1 / (d1 - d2);
        hits.push(p1.clone().lerp(p2, t));
      }
    };
    checkEdge(va, vb, sa, sb);
    checkEdge(vb, vc, sb, sc);
    checkEdge(vc, va, sc, sa);

    if (hits.length === 2 && hits[0].distanceToSquared(hits[1]) > 1e-8) {
      e1.subVectors(vb, va);
      e2.subVectors(vc, va);
      triNormal.crossVectors(e1, e2);
      const tangentDir = new THREE.Vector3().crossVectors(triNormal, pNormal);
      const segDir = new THREE.Vector3().subVectors(hits[1], hits[0]);
      if (tangentDir.dot(segDir) >= 0) {
        segments.push({ a: hits[0], b: hits[1], used: false });
      } else {
        segments.push({ a: hits[1], b: hits[0], used: false });
      }
    }
  }

  if (segments.length < 3) return null;

  // Chain directed segments into closed loop(s)
  const loops3D: THREE.Vector3[][] = [];
  const snapTolSq = 1e-3;

  for (let startIdx = 0; startIdx < segments.length; startIdx++) {
    if (segments[startIdx].used) continue;
    segments[startIdx].used = true;
    const loop: THREE.Vector3[] = [segments[startIdx].a, segments[startIdx].b];
    let currEnd = segments[startIdx].b;
    let safety = 0;

    while (safety < segments.length + 2) {
      safety++;
      if (loop.length >= 3 && currEnd.distanceToSquared(loop[0]) < snapTolSq) {
        break;
      }
      let bestIdx = -1;
      let bestDist = 0.08;
      for (let j = 0; j < segments.length; j++) {
        if (segments[j].used) continue;
        const d = currEnd.distanceToSquared(segments[j].a);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = j;
        }
      }
      if (bestIdx === -1) break;
      segments[bestIdx].used = true;
      currEnd = segments[bestIdx].b;
      if (currEnd.distanceToSquared(loop[loop.length - 1]) > 1e-7) {
        loop.push(currEnd);
      }
    }

    if (loop.length >= 3) {
      loops3D.push(loop);
    }
  }

  if (loops3D.length === 0) return null;

  const { trianglePositions, area, loops2D } = triangulateAndPack(
    loops3D,
    pOrigin,
    uAxis,
    vAxis,
  );
  if (area < 1e-4 || trianglePositions.length === 0) return null;

  const primary2D = simplifyCollinear2D(loops2D[0]);
  const { vertexCount, shapeLabel } = classifyCrossSectionShape(
    solidObj.kind,
    primary2D,
    false,
  );

  return {
    id: `cs_${planeObj.id}_${solidObj.id}`,
    planeId: planeObj.id,
    planeName: planeObj.name,
    solidId: solidObj.id,
    solidName: solidObj.name,
    loops: loops3D.map((l) => l.map((v) => ({ x: v.x, y: v.y, z: v.z }))),
    trianglePositions,
    area,
    vertexCount,
    shapeLabel,
  };
}

// ---------------- Plane ∩ Plane ----------------

function intersectPlanes(
  p1Obj: Geo3DObject,
  p2Obj: Geo3DObject,
): PlanePlaneIntersection3D | null {
  const d1 = getPlaneData(p1Obj);
  const d2 = getPlaneData(p2Obj);
  const dir = new THREE.Vector3().crossVectors(d1.normal, d2.normal);
  const len = dir.length();
  if (len < 1e-4) return null;
  dir.divideScalar(len);

  // Solve for a point p0 on both planes by setting the dominant dir axis = 0
  const ax = Math.abs(dir.x);
  const ay = Math.abs(dir.y);
  const az = Math.abs(dir.z);
  const p0 = new THREE.Vector3();

  if (az >= ax && az >= ay) {
    const det = d1.normal.x * d2.normal.y - d1.normal.y * d2.normal.x;
    p0.x = (d1.constant * d2.normal.y - d2.constant * d1.normal.y) / det;
    p0.y = (d1.normal.x * d2.constant - d2.normal.x * d1.constant) / det;
    p0.z = 0;
  } else if (ay >= ax && ay >= az) {
    const det = d1.normal.x * d2.normal.z - d1.normal.z * d2.normal.x;
    p0.x = (d1.constant * d2.normal.z - d2.constant * d1.normal.z) / det;
    p0.y = 0;
    p0.z = (d1.normal.x * d2.constant - d2.normal.x * d1.constant) / det;
  } else {
    const det = d1.normal.y * d2.normal.z - d1.normal.z * d2.normal.y;
    p0.x = 0;
    p0.y = (d1.constant * d2.normal.z - d2.constant * d1.normal.z) / det;
    p0.z = (d1.normal.y * d2.constant - d2.normal.y * d1.constant) / det;
  }

  // Clip line p(t) = p0 + t*dir to both finite plane squares if overlapping, else around midpoint
  const clipToPlaneSquare = (
    pOrigin: THREE.Vector3,
    uAx: THREE.Vector3,
    vAx: THREE.Vector3,
    halfS: number,
  ): [number, number] | null => {
    let tMin = -1e6;
    let tMax = 1e6;
    const rel = p0.clone().sub(pOrigin);
    const clipAxis = (axis: THREE.Vector3) => {
      const o = rel.dot(axis);
      const d = dir.dot(axis);
      if (Math.abs(d) < 1e-6) {
        if (Math.abs(o) > halfS) return false;
        return true;
      }
      let a = (-halfS - o) / d;
      let b = (halfS - o) / d;
      if (a > b) [a, b] = [b, a];
      tMin = Math.max(tMin, a);
      tMax = Math.min(tMax, b);
      return tMin <= tMax;
    };
    if (!clipAxis(uAx) || !clipAxis(vAx)) return null;
    return [tMin, tMax];
  };

  const r1 = clipToPlaneSquare(d1.point, d1.uAxis, d1.vAxis, p1Obj.dimensions.planeSize * 0.55);
  const r2 = clipToPlaneSquare(d2.point, d2.uAxis, d2.vAxis, p2Obj.dimensions.planeSize * 0.55);

  let tStart = -6;
  let tEnd = 6;
  if (r1 && r2) {
    const lo = Math.max(r1[0], r2[0]);
    const hi = Math.min(r1[1], r2[1]);
    if (hi > lo + 0.1) {
      tStart = lo - 0.5;
      tEnd = hi + 0.5;
    } else {
      const mid = (d1.point.clone().add(d2.point).multiplyScalar(0.5).sub(p0)).dot(dir);
      tStart = mid - 5.5;
      tEnd = mid + 5.5;
    }
  } else {
    const mid = (d1.point.clone().add(d2.point).multiplyScalar(0.5).sub(p0)).dot(dir);
    tStart = mid - 5.5;
    tEnd = mid + 5.5;
  }

  const start = p0.clone().addScaledVector(dir, tStart);
  const end = p0.clone().addScaledVector(dir, tEnd);

  return {
    id: `pp_${p1Obj.id}_${p2Obj.id}`,
    plane1Id: p1Obj.id,
    plane1Name: p1Obj.name,
    plane2Id: p2Obj.id,
    plane2Name: p2Obj.name,
    start: { x: start.x, y: start.y, z: start.z },
    end: { x: end.x, y: end.y, z: end.z },
    origin: { x: p0.x, y: p0.y, z: p0.z },
    direction: { x: dir.x, y: dir.y, z: dir.z },
  };
}

// ---------------- Line ∩ Plane & Line ∩ Solid ----------------

function getLineRay(lineObj: Geo3DObject): { origin: THREE.Vector3; dir: THREE.Vector3 } {
  const mat = getObjectMatrixWorld(lineObj);
  const origin = new THREE.Vector3(0, 0, 0).applyMatrix4(mat);
  const dir = new THREE.Vector3(0, 1, 0).transformDirection(mat).normalize();
  return { origin, dir };
}

function rayTriangleHit(
  origin: THREE.Vector3,
  dir: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
): number | null {
  const e1 = b.clone().sub(a);
  const e2 = c.clone().sub(a);
  const h = new THREE.Vector3().crossVectors(dir, e2);
  const det = e1.dot(h);
  if (Math.abs(det) < 1e-7) return null;
  const invDet = 1 / det;
  const s = origin.clone().sub(a);
  const u = invDet * s.dot(h);
  if (u < -1e-4 || u > 1 + 1e-4) return null;
  const q = new THREE.Vector3().crossVectors(s, e1);
  const v = invDet * dir.dot(q);
  if (v < -1e-4 || u + v > 1 + 1e-4) return null;
  return invDet * e2.dot(q);
}

// ---------------- Solid ∩ Solid (Triangle-Triangle Seam Segments) ----------------

function intersectTwoTriangles(
  tA: [THREE.Vector3, THREE.Vector3, THREE.Vector3],
  tB: [THREE.Vector3, THREE.Vector3, THREE.Vector3],
): [THREE.Vector3, THREE.Vector3] | null {
  const clipTriAgainstPlane = (
    tri: [THREE.Vector3, THREE.Vector3, THREE.Vector3],
    pOrigin: THREE.Vector3,
    pNorm: THREE.Vector3,
  ): [THREE.Vector3, THREE.Vector3] | null => {
    const d = tri.map((v) => pNorm.dot(v.clone().sub(pOrigin)));
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      if (Math.abs(d[i]) < 1e-5) pts.push(tri[i].clone());
      else if ((d[i] > 0 && d[j] < 0) || (d[i] < 0 && d[j] > 0)) {
        const t = d[i] / (d[i] - d[j]);
        pts.push(tri[i].clone().lerp(tri[j], t));
      }
    }
    if (pts.length < 2) return null;
    // Pick furthest pair in pts
    let p0 = pts[0];
    let p1 = pts[1];
    if (pts.length > 2) {
      let bestD = p0.distanceToSquared(p1);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dist = pts[i].distanceToSquared(pts[j]);
          if (dist > bestD) {
            bestD = dist;
            p0 = pts[i];
            p1 = pts[j];
          }
        }
      }
    }
    if (p0.distanceToSquared(p1) < 1e-7) return null;
    return [p0, p1];
  };

  const nA = new THREE.Vector3()
    .subVectors(tA[1], tA[0])
    .cross(new THREE.Vector3().subVectors(tA[2], tA[0]));
  const nB = new THREE.Vector3()
    .subVectors(tB[1], tB[0])
    .cross(new THREE.Vector3().subVectors(tB[2], tB[0]));
  if (nA.lengthSq() < 1e-10 || nB.lengthSq() < 1e-10) return null;
  nA.normalize();
  nB.normalize();

  const lineDir = new THREE.Vector3().crossVectors(nA, nB);
  if (lineDir.lengthSq() < 1e-6) return null;
  lineDir.normalize();

  const segA = clipTriAgainstPlane(tA, tB[0], nB);
  if (!segA) return null;
  const segB = clipTriAgainstPlane(tB, tA[0], nA);
  if (!segB) return null;

  // Overlap intervals along lineDir
  const origin = segA[0];
  const project = (p: THREE.Vector3) => p.clone().sub(origin).dot(lineDir);
  let a0 = project(segA[0]);
  let a1 = project(segA[1]);
  if (a0 > a1) [a0, a1] = [a1, a0];
  let b0 = project(segB[0]);
  let b1 = project(segB[1]);
  if (b0 > b1) [b0, b1] = [b1, b0];

  const lo = Math.max(a0, b0);
  const hi = Math.min(a1, b1);
  if (hi - lo < 1e-4) return null;

  return [
    origin.clone().addScaledVector(lineDir, lo),
    origin.clone().addScaledVector(lineDir, hi),
  ];
}

function getWorldTriangles(
  obj: Geo3DObject,
  solidMesh: SolidMeshBuildResult,
): { tris: [THREE.Vector3, THREE.Vector3, THREE.Vector3][]; box: THREE.Box3 } {
  const mat = getObjectMatrixWorld(obj);
  const posAttr = solidMesh.geometry.getAttribute('position');
  const tris: [THREE.Vector3, THREE.Vector3, THREE.Vector3][] = [];
  const box = new THREE.Box3();
  for (let i = 0; i < posAttr.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(posAttr, i).applyMatrix4(mat);
    const b = new THREE.Vector3().fromBufferAttribute(posAttr, i + 1).applyMatrix4(mat);
    const c = new THREE.Vector3().fromBufferAttribute(posAttr, i + 2).applyMatrix4(mat);
    box.expandByPoint(a);
    box.expandByPoint(b);
    box.expandByPoint(c);
    tris.push([a, b, c]);
  }
  return { tris, box };
}

export function compute3DIntersections(
  objects: Geo3DObject[],
  meshCache: Map<string, SolidMeshBuildResult>,
): Intersection3DSummary {
  const active = objects.filter((o) => o.visible && o.autoIntersect);
  const planes = active.filter((o) => o.kind === 'plane3d');
  const lines = active.filter((o) => o.kind === 'line3d');
  const solids = active.filter((o) => is3DSolidKind(o.kind));

  const crossSections: CrossSection3DResult[] = [];
  const planeLines: PlanePlaneIntersection3D[] = [];
  const lineHits: LineIntersection3D[] = [];
  const solidSeams: SolidSolidIntersection3D[] = [];

  // 1. Plane ∩ Solid
  for (const plane of planes) {
    for (const solid of solids) {
      const built = meshCache.get(solid.id);
      if (!built) continue;
      const cs = sliceSolidWithPlane(plane, solid, built);
      if (cs) crossSections.push(cs);
    }
  }

  // 2. Plane ∩ Plane
  for (let i = 0; i < planes.length; i++) {
    for (let j = i + 1; j < planes.length; j++) {
      const pl = intersectPlanes(planes[i], planes[j]);
      if (pl) planeLines.push(pl);
    }
  }

  // 3. Line ∩ Plane & Line ∩ Solid
  for (const line of lines) {
    const { origin, dir } = getLineRay(line);

    for (const plane of planes) {
      const pd = getPlaneData(plane);
      const denom = pd.normal.dot(dir);
      if (Math.abs(denom) > 1e-4) {
        const t = (pd.constant - pd.normal.dot(origin)) / denom;
        const hit = origin.clone().addScaledVector(dir, t);
        lineHits.push({
          id: `lp_${line.id}_${plane.id}`,
          lineId: line.id,
          lineName: line.name,
          targetId: plane.id,
          targetName: plane.name,
          points: [{ x: hit.x, y: hit.y, z: hit.z }],
          interiorSegments: [],
        });
      }
    }

    for (const solid of solids) {
      const built = meshCache.get(solid.id);
      if (!built) continue;
      const { tris } = getWorldTriangles(solid, built);
      const tVals: number[] = [];
      for (const [a, b, c] of tris) {
        const t = rayTriangleHit(origin, dir, a, b, c);
        if (t !== null) {
          if (!tVals.some((tv) => Math.abs(tv - t) < 1e-2)) {
            tVals.push(t);
          }
        }
      }
      tVals.sort((x, y) => x - y);
      if (tVals.length > 0) {
        const pts = tVals.map((t) => {
          const p = origin.clone().addScaledVector(dir, t);
          return { x: p.x, y: p.y, z: p.z };
        });
        const interiorSegments: [Vec3, Vec3][] = [];
        for (let k = 0; k + 1 < pts.length; k += 2) {
          interiorSegments.push([pts[k], pts[k + 1]]);
        }
        lineHits.push({
          id: `ls_${line.id}_${solid.id}`,
          lineId: line.id,
          lineName: line.name,
          targetId: solid.id,
          targetName: solid.name,
          points: pts,
          interiorSegments,
        });
      }
    }
  }

  // 4. Solid ∩ Solid (skip if mesh has too many triangles on both to keep 60fps; polyhedra & low-mid poly are instant)
  const worldCache = new Map<
    string,
    { tris: [THREE.Vector3, THREE.Vector3, THREE.Vector3][]; box: THREE.Box3 }
  >();
  for (const s of solids) {
    const built = meshCache.get(s.id);
    if (built) worldCache.set(s.id, getWorldTriangles(s, built));
  }

  for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      const s1 = solids[i];
      const s2 = solids[j];
      const w1 = worldCache.get(s1.id);
      const w2 = worldCache.get(s2.id);
      if (!w1 || !w2) continue;
      if (!w1.box.intersectsBox(w2.box)) continue;
      // Keep heavy round-round intersections capped cleanly for smooth dragging
      if (w1.tris.length * w2.tris.length > 25000) continue;

      const segs: [Vec3, Vec3][] = [];
      for (const tA of w1.tris) {
        for (const tB of w2.tris) {
          const seg = intersectTwoTriangles(tA, tB);
          if (seg) {
            segs.push([
              { x: seg[0].x, y: seg[0].y, z: seg[0].z },
              { x: seg[1].x, y: seg[1].y, z: seg[1].z },
            ]);
          }
        }
      }
      if (segs.length > 0) {
        solidSeams.push({
          id: `ss_${s1.id}_${s2.id}`,
          solid1Id: s1.id,
          solid1Name: s1.name,
          solid2Id: s2.id,
          solid2Name: s2.name,
          segments: segs,
        });
      }
    }
  }

  return {
    crossSections,
    planeLines,
    lineHits,
    solidSeams,
  };
}
