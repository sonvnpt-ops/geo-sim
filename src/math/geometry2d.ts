import {
  Geo2DKind,
  Geo2DObject,
  Intersection2DSummary,
  IntersectionPoint2D,
  IntersectionRegion2D,
  SHAPE_COLORS,
  Vec2,
} from '../types/geometry';

const EPS = 1e-6;

export function dist2D(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function polygonArea2D(pts: Vec2[]): number {
  if (pts.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    sum += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(sum) * 0.5;
}

export function polygonPerimeter2D(pts: Vec2[]): number {
  if (pts.length < 2) return 0;
  let p = 0;
  for (let i = 0; i < pts.length; i++) {
    p += dist2D(pts[i], pts[(i + 1) % pts.length]);
  }
  return p;
}

export function polygonCentroid2D(pts: Vec2[]): Vec2 {
  if (pts.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const p of pts) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / pts.length, y: sy / pts.length };
}

export function rotatePoints2D(pts: Vec2[], center: Vec2, angleRad: number): Vec2[] {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return pts.map((p) => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return {
      x: center.x + dx * c - dy * s,
      y: center.y + dx * s + dy * c,
    };
  });
}

export function scalePoints2D(pts: Vec2[], center: Vec2, factor: number): Vec2[] {
  return pts.map((p) => ({
    x: center.x + (p.x - center.x) * factor,
    y: center.y + (p.y - center.y) * factor,
  }));
}

export function isPolygonKind(kind: Geo2DKind): boolean {
  return (
    kind !== 'point2d' &&
    kind !== 'segment2d' &&
    kind !== 'line2d' &&
    kind !== 'ray2d' &&
    kind !== 'angle2d' &&
    kind !== 'circle2d'
  );
}

export interface Create2DParams {
  size?: number;
  width?: number;
  height?: number;
  radius?: number;
  offset?: Vec2;
  points?: Vec2[];
}

const KIND_NAMES_VI: Record<Geo2DKind, string> = {
  point2d: 'Điểm',
  segment2d: 'Đoạn thẳng',
  line2d: 'Đường thẳng',
  ray2d: 'Tia',
  angle2d: 'Góc',
  circle2d: 'Đường tròn',
  triangle: 'Tam giác thường',
  right_triangle: 'Tam giác vuông',
  isosceles_triangle: 'Tam giác cân',
  equilateral_triangle: 'Tam giác đều',
  square: 'Hình vuông',
  rectangle: 'Hình chữ nhật',
  trapezoid: 'Hình thang',
  right_trapezoid: 'Hình thang vuông',
  isosceles_trapezoid: 'Hình thang cân',
  parallelogram: 'Hình bình hành',
  rhombus: 'Hình thoi',
  custom_polygon: 'Đa giác tùy ý',
};

export function get2DKindLabel(kind: Geo2DKind): string {
  return KIND_NAMES_VI[kind];
}

const VERTEX_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function makeDefault2DObject(
  kind: Geo2DKind,
  existingCount: number,
  params: Create2DParams = {},
): Geo2DObject {
  const id = `obj2d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const color = SHAPE_COLORS[existingCount % SHAPE_COLORS.length];
  const off = params.offset ?? {
    x: ((existingCount % 5) - 2) * 0.6,
    y: (Math.floor(existingCount / 5) % 3 - 1) * 0.6,
  };
  const s = params.size ?? 3.2;
  const w = params.width ?? 4.0;
  const h = params.height ?? 2.6;
  const r = params.radius ?? 2.0;

  let points: Vec2[] = [];
  let pointLabels: string[] = [];
  let radius: number | undefined;

  const baseIdx = (existingCount * 3) % VERTEX_ALPHABET.length;
  const lbl = (i: number) => VERTEX_ALPHABET[(baseIdx + i) % VERTEX_ALPHABET.length];

  switch (kind) {
    case 'point2d':
      points = [{ x: off.x, y: off.y }];
      pointLabels = [lbl(0)];
      break;
    case 'segment2d':
      points = [
        { x: off.x - s * 0.6, y: off.y - 0.5 },
        { x: off.x + s * 0.6, y: off.y + 0.5 },
      ];
      pointLabels = ['A', 'B'];
      break;
    case 'line2d':
      points = [
        { x: off.x - 2.0, y: off.y - 0.8 },
        { x: off.x + 2.0, y: off.y + 0.8 },
      ];
      pointLabels = ['A', 'B'];
      break;
    case 'ray2d':
      points = [
        { x: off.x - 1.5, y: off.y - 0.4 },
        { x: off.x + 1.5, y: off.y + 0.6 },
      ];
      pointLabels = ['O', 'x'];
      break;
    case 'angle2d':
      points = [
        { x: off.x + 2.4, y: off.y + 0.2 },
        { x: off.x - 1.0, y: off.y - 0.8 },
        { x: off.x + 1.4, y: off.y + 2.0 },
      ];
      pointLabels = ['x', 'O', 'y'];
      break;
    case 'circle2d':
      points = [{ x: off.x, y: off.y }];
      pointLabels = ['O'];
      radius = r;
      break;
    case 'triangle':
      points = [
        { x: off.x - s * 0.55, y: off.y - h * 0.45 },
        { x: off.x + s * 0.65, y: off.y - h * 0.45 },
        { x: off.x + s * 0.15, y: off.y + h * 0.65 },
      ];
      pointLabels = ['A', 'B', 'C'];
      break;
    case 'right_triangle':
      points = [
        { x: off.x - w * 0.4, y: off.y - h * 0.45 },
        { x: off.x + w * 0.6, y: off.y - h * 0.45 },
        { x: off.x - w * 0.4, y: off.y + h * 0.65 },
      ];
      pointLabels = ['A', 'B', 'C'];
      break;
    case 'isosceles_triangle':
      points = [
        { x: off.x - s * 0.55, y: off.y - h * 0.5 },
        { x: off.x + s * 0.55, y: off.y - h * 0.5 },
        { x: off.x, y: off.y + h * 0.65 },
      ];
      pointLabels = ['B', 'C', 'A'];
      break;
    case 'equilateral_triangle': {
      const eqH = (s * Math.sqrt(3)) / 2;
      points = [
        { x: off.x - s / 2, y: off.y - eqH / 3 },
        { x: off.x + s / 2, y: off.y - eqH / 3 },
        { x: off.x, y: off.y + (2 * eqH) / 3 },
      ];
      pointLabels = ['B', 'C', 'A'];
      break;
    }
    case 'square': {
      const hs = s / 2;
      points = [
        { x: off.x - hs, y: off.y - hs },
        { x: off.x + hs, y: off.y - hs },
        { x: off.x + hs, y: off.y + hs },
        { x: off.x - hs, y: off.y + hs },
      ];
      pointLabels = ['A', 'B', 'C', 'D'];
      break;
    }
    case 'rectangle': {
      const hw = w / 2;
      const hh = h / 2;
      points = [
        { x: off.x - hw, y: off.y - hh },
        { x: off.x + hw, y: off.y - hh },
        { x: off.x + hw, y: off.y + hh },
        { x: off.x - hw, y: off.y + hh },
      ];
      pointLabels = ['A', 'B', 'C', 'D'];
      break;
    }
    case 'trapezoid':
      points = [
        { x: off.x - w * 0.55, y: off.y - h * 0.5 },
        { x: off.x + w * 0.55, y: off.y - h * 0.5 },
        { x: off.x + w * 0.2, y: off.y + h * 0.5 },
        { x: off.x - w * 0.35, y: off.y + h * 0.5 },
      ];
      pointLabels = ['D', 'C', 'B', 'A'];
      break;
    case 'right_trapezoid':
      points = [
        { x: off.x - w * 0.5, y: off.y - h * 0.5 },
        { x: off.x + w * 0.55, y: off.y - h * 0.5 },
        { x: off.x + w * 0.2, y: off.y + h * 0.5 },
        { x: off.x - w * 0.5, y: off.y + h * 0.5 },
      ];
      pointLabels = ['D', 'C', 'B', 'A'];
      break;
    case 'isosceles_trapezoid':
      points = [
        { x: off.x - w * 0.55, y: off.y - h * 0.5 },
        { x: off.x + w * 0.55, y: off.y - h * 0.5 },
        { x: off.x + w * 0.3, y: off.y + h * 0.5 },
        { x: off.x - w * 0.3, y: off.y + h * 0.5 },
      ];
      pointLabels = ['D', 'C', 'B', 'A'];
      break;
    case 'parallelogram':
      points = [
        { x: off.x - w * 0.55, y: off.y - h * 0.5 },
        { x: off.x + w * 0.35, y: off.y - h * 0.5 },
        { x: off.x + w * 0.55, y: off.y + h * 0.5 },
        { x: off.x - w * 0.35, y: off.y + h * 0.5 },
      ];
      pointLabels = ['D', 'C', 'B', 'A'];
      break;
    case 'rhombus':
      points = [
        { x: off.x, y: off.y - h * 0.65 },
        { x: off.x + w * 0.45, y: off.y },
        { x: off.x, y: off.y + h * 0.65 },
        { x: off.x - w * 0.45, y: off.y },
      ];
      pointLabels = ['A', 'B', 'C', 'D'];
      break;
    case 'custom_polygon':
      points = params.points ?? [
        { x: off.x - 1.5, y: off.y - 1.2 },
        { x: off.x + 1.5, y: off.y - 1.2 },
        { x: off.x + 2.0, y: off.y + 0.4 },
        { x: off.x + 0.2, y: off.y + 1.6 },
        { x: off.x - 1.8, y: off.y + 0.6 },
      ];
      pointLabels = points.map((_, idx) => VERTEX_ALPHABET[idx % VERTEX_ALPHABET.length]);
      break;
  }

  return {
    id,
    name: `${KIND_NAMES_VI[kind]} ${existingCount + 1}`,
    kind,
    color,
    opacity: isPolygonKind(kind) ? 0.24 : 1,
    visible: true,
    showLabels: true,
    autoIntersect: true,
    points,
    pointLabels,
    radius,
  };
}

export function pointInPolygon2D(pt: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function distanceToSegment2D(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return dist2D(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function distanceToLine2D(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return dist2D(p, a);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

export function distanceToRay2D(p: Vec2, origin: Vec2, through: Vec2): number {
  const dx = through.x - origin.x;
  const dy = through.y - origin.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-12) return dist2D(p, origin);
  const t = Math.max(0, ((p.x - origin.x) * dx + (p.y - origin.y) * dy) / lenSq);
  return Math.hypot(p.x - (origin.x + t * dx), p.y - (origin.y + t * dy));
}

// ---------------- Linear & Circular Intersections ----------------

type LinearKind = 'segment' | 'line' | 'ray';

interface LinearPrimitive {
  a: Vec2;
  b: Vec2;
  kind: LinearKind;
}

function getLinearPrimitives(obj: Geo2DObject): LinearPrimitive[] {
  if (obj.kind === 'segment2d' && obj.points.length >= 2) {
    return [{ a: obj.points[0], b: obj.points[1], kind: 'segment' }];
  }
  if (obj.kind === 'line2d' && obj.points.length >= 2) {
    return [{ a: obj.points[0], b: obj.points[1], kind: 'line' }];
  }
  if (obj.kind === 'ray2d' && obj.points.length >= 2) {
    return [{ a: obj.points[0], b: obj.points[1], kind: 'ray' }];
  }
  if (obj.kind === 'angle2d' && obj.points.length >= 3) {
    return [
      { a: obj.points[1], b: obj.points[0], kind: 'ray' },
      { a: obj.points[1], b: obj.points[2], kind: 'ray' },
    ];
  }
  if (isPolygonKind(obj.kind) && obj.points.length >= 2) {
    const segs: LinearPrimitive[] = [];
    for (let i = 0; i < obj.points.length; i++) {
      segs.push({
        a: obj.points[i],
        b: obj.points[(i + 1) % obj.points.length],
        kind: 'segment',
      });
    }
    return segs;
  }
  return [];
}

function validParam(t: number, kind: LinearKind): boolean {
  if (kind === 'line') return true;
  if (kind === 'ray') return t >= -EPS;
  return t >= -EPS && t <= 1 + EPS;
}

function intersectLinearPair(p1: LinearPrimitive, p2: LinearPrimitive): Vec2 | null {
  const dx1 = p1.b.x - p1.a.x;
  const dy1 = p1.b.y - p1.a.y;
  const dx2 = p2.b.x - p2.a.x;
  const dy2 = p2.b.y - p2.a.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-8) return null;
  const rx = p2.a.x - p1.a.x;
  const ry = p2.a.y - p1.a.y;
  const t = (rx * dy2 - ry * dx2) / denom;
  const u = (rx * dy1 - ry * dx1) / denom;
  if (validParam(t, p1.kind) && validParam(u, p2.kind)) {
    return { x: p1.a.x + t * dx1, y: p1.a.y + t * dy1 };
  }
  return null;
}

function intersectLinearCircle(p: LinearPrimitive, center: Vec2, radius: number): Vec2[] {
  const dx = p.b.x - p.a.x;
  const dy = p.b.y - p.a.y;
  const fx = p.a.x - center.x;
  const fy = p.a.y - center.y;
  const A = dx * dx + dy * dy;
  if (A < 1e-10) return [];
  const B = 2 * (fx * dx + fy * dy);
  const C = fx * fx + fy * fy - radius * radius;
  const disc = B * B - 4 * A * C;
  if (disc < -1e-7) return [];
  const sqrtD = Math.sqrt(Math.max(0, disc));
  const t1 = (-B - sqrtD) / (2 * A);
  const t2 = (-B + sqrtD) / (2 * A);
  const hits: Vec2[] = [];
  if (validParam(t1, p.kind)) {
    hits.push({ x: p.a.x + t1 * dx, y: p.a.y + t1 * dy });
  }
  if (Math.abs(t2 - t1) > 1e-5 && validParam(t2, p.kind)) {
    hits.push({ x: p.a.x + t2 * dx, y: p.a.y + t2 * dy });
  }
  return hits;
}

function intersectCirclePair(c1: Vec2, r1: number, c2: Vec2, r2: number): Vec2[] {
  const d = dist2D(c1, c2);
  if (d < 1e-7 || d > r1 + r2 + EPS || d < Math.abs(r1 - r2) - EPS) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const hSq = Math.max(0, r1 * r1 - a * a);
  const h = Math.sqrt(hSq);
  const px = c1.x + (a * (c2.x - c1.x)) / d;
  const py = c1.y + (a * (c2.y - c1.y)) / d;
  const rx = (-(c2.y - c1.y) * h) / d;
  const ry = ((c2.x - c1.x) * h) / d;
  if (h < 1e-5) {
    return [{ x: px, y: py }];
  }
  return [
    { x: px + rx, y: py + ry },
    { x: px - rx, y: py - ry },
  ];
}

// ---------------- General Polygon Clipping (Ear-Clip + Triangle Sutherland-Hodgman) ----------------

function signedArea(pts: Vec2[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    s += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return s * 0.5;
}

function ensureCCW(pts: Vec2[]): Vec2[] {
  if (pts.length < 3) return pts;
  return signedArea(pts) < 0 ? [...pts].reverse() : [...pts];
}

function pointInTriangle(p: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean {
  const cross = (u: Vec2, v: Vec2, w: Vec2) =>
    (v.x - u.x) * (w.y - u.y) - (v.y - u.y) * (w.x - u.x);
  const c1 = cross(a, b, p);
  const c2 = cross(b, c, p);
  const c3 = cross(c, a, p);
  return c1 >= -1e-7 && c2 >= -1e-7 && c3 >= -1e-7;
}

function earClipTriangulate(rawPts: Vec2[]): [Vec2, Vec2, Vec2][] {
  const pts = ensureCCW(rawPts);
  if (pts.length < 3) return [];
  if (pts.length === 3) return [[pts[0], pts[1], pts[2]]];
  const indices = pts.map((_, i) => i);
  const tris: [Vec2, Vec2, Vec2][] = [];
  let guard = 0;

  while (indices.length > 3 && guard < 500) {
    guard++;
    let foundEar = false;
    for (let i = 0; i < indices.length; i++) {
      const iPrev = indices[(i - 1 + indices.length) % indices.length];
      const iCurr = indices[i];
      const iNext = indices[(i + 1) % indices.length];
      const a = pts[iPrev];
      const b = pts[iCurr];
      const c = pts[iNext];
      const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      if (cross <= 1e-8) continue;

      let containsAny = false;
      for (let j = 0; j < indices.length; j++) {
        const idx = indices[j];
        if (idx === iPrev || idx === iCurr || idx === iNext) continue;
        if (pointInTriangle(pts[idx], a, b, c)) {
          containsAny = true;
          break;
        }
      }
      if (!containsAny) {
        tris.push([a, b, c]);
        indices.splice(i, 1);
        foundEar = true;
        break;
      }
    }
    if (!foundEar) break;
  }
  if (indices.length === 3) {
    tris.push([pts[indices[0]], pts[indices[1]], pts[indices[2]]]);
  }
  return tris;
}

function clipConvexPolyWithEdge(poly: Vec2[], edgeA: Vec2, edgeB: Vec2): Vec2[] {
  if (poly.length === 0) return [];
  const inside = (p: Vec2) =>
    (edgeB.x - edgeA.x) * (p.y - edgeA.y) - (edgeB.y - edgeA.y) * (p.x - edgeA.x) >= -1e-7;
  const intersect = (p1: Vec2, p2: Vec2): Vec2 => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const ex = edgeB.x - edgeA.x;
    const ey = edgeB.y - edgeA.y;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-10) return p1;
    const t = ((edgeA.x - p1.x) * ey - (edgeA.y - p1.y) * ex) / denom;
    return { x: p1.x + t * dx, y: p1.y + t * dy };
  };

  const out: Vec2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const curr = poly[i];
    const prev = poly[(i - 1 + poly.length) % poly.length];
    const currIn = inside(curr);
    const prevIn = inside(prev);
    if (currIn) {
      if (!prevIn) out.push(intersect(prev, curr));
      out.push(curr);
    } else if (prevIn) {
      out.push(intersect(prev, curr));
    }
  }
  return out;
}

function intersectTriangles2D(t1: [Vec2, Vec2, Vec2], t2: [Vec2, Vec2, Vec2]): Vec2[] {
  let poly: Vec2[] = [...t1];
  for (let i = 0; i < 3; i++) {
    poly = clipConvexPolyWithEdge(poly, t2[i], t2[(i + 1) % 3]);
    if (poly.length < 3) return [];
  }
  return poly;
}

function approximateCirclePolygon(center: Vec2, radius: number, segments = 48): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push({ x: center.x + Math.cos(a) * radius, y: center.y + Math.sin(a) * radius });
  }
  return pts;
}

function get2DAreaPolygon(obj: Geo2DObject): Vec2[] | null {
  if (obj.kind === 'circle2d' && obj.points.length >= 1 && (obj.radius ?? 0) > 0) {
    return approximateCirclePolygon(obj.points[0], obj.radius ?? 1, 48);
  }
  if (isPolygonKind(obj.kind) && obj.points.length >= 3) {
    return obj.points;
  }
  return null;
}

function edgeKey(a: Vec2, b: Vec2): string {
  const q = (v: number) => Math.round(v * 1000);
  const ka = `${q(a.x)},${q(a.y)}`;
  const kb = `${q(b.x)},${q(b.y)}`;
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

export function compute2DIntersections(objects: Geo2DObject[]): Intersection2DSummary {
  const active = objects.filter((o) => o.visible && o.autoIntersect);
  const points: IntersectionPoint2D[] = [];
  const regions: IntersectionRegion2D[] = [];

  const pushPoint = (pt: Vec2, nameA: string, nameB: string) => {
    const dup = points.some((existing) => dist2D(existing.point, pt) < 0.02);
    if (!dup) {
      points.push({
        id: `pt2d_${points.length}`,
        point: pt,
        sources: [nameA, nameB],
      });
    }
  };

  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const A = active[i];
      const B = active[j];

      // 1. Boundary point intersections
      const linA = getLinearPrimitives(A);
      const linB = getLinearPrimitives(B);

      if (linA.length > 0 && linB.length > 0) {
        for (const pa of linA) {
          for (const pb of linB) {
            const hit = intersectLinearPair(pa, pb);
            if (hit) pushPoint(hit, A.name, B.name);
          }
        }
      }

      if (linA.length > 0 && B.kind === 'circle2d' && B.points[0] && B.radius) {
        for (const pa of linA) {
          for (const hit of intersectLinearCircle(pa, B.points[0], B.radius)) {
            pushPoint(hit, A.name, B.name);
          }
        }
      }

      if (linB.length > 0 && A.kind === 'circle2d' && A.points[0] && A.radius) {
        for (const pb of linB) {
          for (const hit of intersectLinearCircle(pb, A.points[0], A.radius)) {
            pushPoint(hit, A.name, B.name);
          }
        }
      }

      if (
        A.kind === 'circle2d' &&
        B.kind === 'circle2d' &&
        A.points[0] &&
        B.points[0] &&
        A.radius &&
        B.radius
      ) {
        for (const hit of intersectCirclePair(A.points[0], A.radius, B.points[0], B.radius)) {
          pushPoint(hit, A.name, B.name);
        }
      }

      // 2. Area overlap between filled 2D shapes (Polygons & Circles)
      const polyA = get2DAreaPolygon(A);
      const polyB = get2DAreaPolygon(B);
      if (polyA && polyB) {
        const trisA = earClipTriangulate(polyA);
        const trisB = earClipTriangulate(polyB);
        const outTris: [Vec2, Vec2, Vec2][] = [];
        const edgeCounts = new Map<string, { count: number; edge: [Vec2, Vec2] }>();
        let totalArea = 0;

        for (const ta of trisA) {
          for (const tb of trisB) {
            const clipped = intersectTriangles2D(ta, tb);
            if (clipped.length >= 3) {
              const area = polygonArea2D(clipped);
              if (area > 1e-5) {
                totalArea += area;
                for (let k = 1; k < clipped.length - 1; k++) {
                  outTris.push([clipped[0], clipped[k], clipped[k + 1]]);
                }
                for (let k = 0; k < clipped.length; k++) {
                  const ea = clipped[k];
                  const eb = clipped[(k + 1) % clipped.length];
                  if (dist2D(ea, eb) < 1e-5) continue;
                  const key = edgeKey(ea, eb);
                  const prev = edgeCounts.get(key);
                  if (prev) prev.count += 1;
                  else edgeCounts.set(key, { count: 1, edge: [ea, eb] });
                }
              }
            }
          }
        }

        if (totalArea > 1e-3 && outTris.length > 0) {
          const boundaryEdges: [Vec2, Vec2][] = [];
          edgeCounts.forEach((v) => {
            if (v.count === 1) boundaryEdges.push(v.edge);
          });
          regions.push({
            id: `reg2d_${regions.length}`,
            triangles: outTris,
            boundaryEdges,
            area: totalArea,
            sources: [A.name, B.name],
          });
        }
      }
    }
  }

  return { points, regions };
}

export function computeAngleDegrees2D(a: Vec2, vertex: Vec2, c: Vec2): number {
  const v1x = a.x - vertex.x;
  const v1y = a.y - vertex.y;
  const v2x = c.x - vertex.x;
  const v2y = c.y - vertex.y;
  const m1 = Math.hypot(v1x, v1y);
  const m2 = Math.hypot(v2x, v2y);
  if (m1 < 1e-7 || m2 < 1e-7) return 0;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (m1 * m2)));
  return (Math.acos(cos) * 180) / Math.PI;
}
