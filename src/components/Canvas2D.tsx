import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { RotateCcw, RotateCw, Trash2, Check, X } from 'lucide-react';
import {
  computeAngleDegrees2D,
  dist2D,
  distanceToLine2D,
  distanceToRay2D,
  distanceToSegment2D,
  isPolygonKind,
  pointInPolygon2D,
  polygonCentroid2D,
  rotatePoints2D,
} from '../math/geometry2d';
import { Geo2DObject, Intersection2DSummary, Vec2 } from '../types/geometry';

export interface Canvas2DHandle {
  exportPng: () => void;
  resetView: () => void;
}

interface Canvas2DProps {
  objects: Geo2DObject[];
  selectedIds: string[];
  intersections: Intersection2DSummary;
  showGrid: boolean;
  showAxes: boolean;
  snapToGrid: boolean;
  isDark: boolean;
  drawingCustomPolygon: boolean;
  onFinishCustomPolygon: (points: Vec2[]) => void;
  onCancelCustomPolygon: () => void;
  onSelect: (ids: string[]) => void;
  onUpdateObjects: (updater: (prev: Geo2DObject[]) => Geo2DObject[], recordHistory?: boolean) => void;
  onDeleteSelected: () => void;
}

interface DragState {
  mode: 'pan' | 'move_object' | 'move_vertex' | 'resize_circle';
  objectId?: string;
  vertexIndex?: number;
  startScreen: Vec2;
  lastWorld: Vec2;
  startPan: Vec2;
  didMove: boolean;
}

export const Canvas2D = forwardRef<Canvas2DHandle, Canvas2DProps>(function Canvas2D(
  {
    objects,
    selectedIds,
    intersections,
    showGrid,
    showAxes,
    snapToGrid,
    isDark,
    drawingCustomPolygon,
    onFinishCustomPolygon,
    onCancelCustomPolygon,
    onSelect,
    onUpdateObjects,
    onDeleteSelected,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [pan, setPan] = useState<Vec2>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(64); // pixels per world unit
  const [cursorWorld, setCursorWorld] = useState<Vec2>({ x: 0, y: 0 });
  const [customDraft, setCustomDraft] = useState<Vec2[]>([]);
  const [hoveredHandle, setHoveredHandle] = useState<{ objId: string; idx: number } | null>(null);

  const dragRef = useRef<DragState | null>(null);
  const objectsSnapshotBeforeDrag = useRef<Geo2DObject[] | null>(null);

  const screenToWorld = useCallback(
    (sx: number, sy: number, width: number, height: number): Vec2 => {
      return {
        x: (sx - width / 2 - pan.x) / zoom,
        y: -(sy - height / 2 - pan.y) / zoom,
      };
    },
    [pan, zoom],
  );

  const worldToScreen = useCallback(
    (wx: number, wy: number, width: number, height: number): Vec2 => {
      return {
        x: width / 2 + pan.x + wx * zoom,
        y: height / 2 + pan.y - wy * zoom,
      };
    },
    [pan, zoom],
  );

  const snap = useCallback(
    (v: Vec2): Vec2 => {
      if (!snapToGrid) return v;
      const step = 0.25;
      return {
        x: Math.round(v.x / step) * step,
        y: Math.round(v.y / step) * step,
      };
    },
    [snapToGrid],
  );

  useImperativeHandle(ref, () => ({
    exportPng: () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `geosim-2d-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    },
    resetView: () => {
      setPan({ x: 0, y: 0 });
      setZoom(64);
    },
  }));

  useEffect(() => {
    if (!drawingCustomPolygon) {
      setCustomDraft([]);
    }
  }, [drawingCustomPolygon]);

  // Draw Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = isDark ? '#0B1120' : '#F8FAFC';
    ctx.fillRect(0, 0, width, height);

    const topLeft = screenToWorld(0, 0, width, height);
    const botRight = screenToWorld(width, height, width, height);

    // Grid
    if (showGrid) {
      const minorStep = zoom >= 48 ? 0.5 : 1;
      const majorStep = zoom >= 30 ? 1 : 2;

      const xMin = Math.floor(topLeft.x / minorStep) * minorStep;
      const xMax = Math.ceil(botRight.x / minorStep) * minorStep;
      const yMin = Math.floor(botRight.y / minorStep) * minorStep;
      const yMax = Math.ceil(topLeft.y / minorStep) * minorStep;

      ctx.lineWidth = 1;
      for (let x = xMin; x <= xMax + 1e-6; x += minorStep) {
        const sx = worldToScreen(x, 0, width, height).x;
        const isMajor = Math.abs(Math.round(x / majorStep) * majorStep - x) < 1e-4;
        ctx.strokeStyle = isMajor
          ? isDark
            ? 'rgba(148, 163, 184, 0.16)'
            : 'rgba(15, 23, 42, 0.09)'
          : isDark
            ? 'rgba(148, 163, 184, 0.06)'
            : 'rgba(15, 23, 42, 0.04)';
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.stroke();
      }

      for (let y = yMin; y <= yMax + 1e-6; y += minorStep) {
        const sy = worldToScreen(0, y, width, height).y;
        const isMajor = Math.abs(Math.round(y / majorStep) * majorStep - y) < 1e-4;
        ctx.strokeStyle = isMajor
          ? isDark
            ? 'rgba(148, 163, 184, 0.16)'
            : 'rgba(15, 23, 42, 0.09)'
          : isDark
            ? 'rgba(148, 163, 184, 0.06)'
            : 'rgba(15, 23, 42, 0.04)';
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();
      }
    }

    // Axes Ox, Oy
    if (showAxes) {
      const origin = worldToScreen(0, 0, width, height);
      ctx.strokeStyle = isDark ? 'rgba(226, 232, 240, 0.42)' : 'rgba(15, 23, 42, 0.35)';
      ctx.lineWidth = 1.5;

      // X axis
      ctx.beginPath();
      ctx.moveTo(0, origin.y);
      ctx.lineTo(width, origin.y);
      ctx.stroke();

      // Y axis
      ctx.beginPath();
      ctx.moveTo(origin.x, 0);
      ctx.lineTo(origin.x, height);
      ctx.stroke();

      // Tick numbers
      ctx.font = '500 11px "IBM Plex Mono", monospace';
      ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
      const step = zoom >= 36 ? 1 : 2;
      const xStart = Math.floor(topLeft.x / step) * step;
      const xEnd = Math.ceil(botRight.x / step) * step;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (let x = xStart; x <= xEnd; x += step) {
        if (Math.abs(x) < 1e-5) continue;
        const sx = worldToScreen(x, 0, width, height).x;
        ctx.fillText(String(x), sx, Math.min(height - 18, Math.max(6, origin.y + 6)));
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const yStart = Math.floor(botRight.y / step) * step;
      const yEnd = Math.ceil(topLeft.y / step) * step;
      for (let y = yStart; y <= yEnd; y += step) {
        if (Math.abs(y) < 1e-5) continue;
        const sy = worldToScreen(0, y, width, height).y;
        ctx.fillText(String(y), Math.max(24, Math.min(width - 8, origin.x - 6)), sy);
      }

      // Axis labels
      ctx.font = '600 12px "DM Sans", sans-serif';
      ctx.fillStyle = isDark ? '#E2E8F0' : '#0F172A';
      ctx.textAlign = 'left';
      ctx.fillText('x', width - 16, Math.min(height - 18, Math.max(14, origin.y - 14)));
      ctx.fillText('y', Math.max(14, Math.min(width - 18, origin.x + 10)), 14);
      ctx.fillText('O', origin.x - 14, origin.y + 12);
    }

    // Draw Objects
    for (const obj of objects) {
      if (!obj.visible) continue;
      const isSelected = selectedIds.includes(obj.id);
      const ptsScreen = obj.points.map((p) => worldToScreen(p.x, p.y, width, height));

      ctx.save();
      const strokeColor = obj.color;
      ctx.strokeStyle = strokeColor;
      ctx.fillStyle = strokeColor;

      if (isSelected) {
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 10;
      }

      if (isPolygonKind(obj.kind) && ptsScreen.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(ptsScreen[0].x, ptsScreen[0].y);
        for (let i = 1; i < ptsScreen.length; i++) {
          ctx.lineTo(ptsScreen[i].x, ptsScreen[i].y);
        }
        ctx.closePath();
        ctx.globalAlpha = obj.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = isSelected ? 2.8 : 2;
        ctx.stroke();
      } else if (obj.kind === 'circle2d' && ptsScreen[0] && obj.radius) {
        const rPx = obj.radius * zoom;
        ctx.beginPath();
        ctx.arc(ptsScreen[0].x, ptsScreen[0].y, rPx, 0, Math.PI * 2);
        ctx.globalAlpha = obj.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = isSelected ? 2.8 : 2;
        ctx.stroke();

        // Subtle radius line + handle on right edge
        const edgePt = worldToScreen(obj.points[0].x + obj.radius, obj.points[0].y, width, height);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.25;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(ptsScreen[0].x, ptsScreen[0].y);
        ctx.lineTo(edgePt.x, edgePt.y);
        ctx.stroke();
        ctx.restore();

        // Radius handle
        ctx.beginPath();
        ctx.arc(edgePt.x, edgePt.y, isSelected ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = strokeColor;
        ctx.stroke();

        if (obj.showLabels) {
          const midX = (ptsScreen[0].x + edgePt.x) / 2;
          const midY = (ptsScreen[0].y + edgePt.y) / 2 - 10;
          ctx.font = '500 11px "IBM Plex Mono", monospace';
          ctx.fillStyle = isDark ? '#E2E8F0' : '#0F172A';
          ctx.fillText(`R=${obj.radius.toFixed(2)}`, midX - 16, midY);
        }
      } else if (obj.kind === 'segment2d' && ptsScreen.length >= 2) {
        ctx.lineWidth = isSelected ? 3 : 2.2;
        ctx.beginPath();
        ctx.moveTo(ptsScreen[0].x, ptsScreen[0].y);
        ctx.lineTo(ptsScreen[1].x, ptsScreen[1].y);
        ctx.stroke();
      } else if (obj.kind === 'line2d' && ptsScreen.length >= 2) {
        const dx = ptsScreen[1].x - ptsScreen[0].x;
        const dy = ptsScreen[1].y - ptsScreen[0].y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const ext = Math.max(width, height) * 1.5;
        ctx.lineWidth = isSelected ? 2.8 : 2;
        ctx.beginPath();
        ctx.moveTo(ptsScreen[0].x - ux * ext, ptsScreen[0].y - uy * ext);
        ctx.lineTo(ptsScreen[0].x + ux * ext, ptsScreen[0].y + uy * ext);
        ctx.stroke();
      } else if (obj.kind === 'ray2d' && ptsScreen.length >= 2) {
        const dx = ptsScreen[1].x - ptsScreen[0].x;
        const dy = ptsScreen[1].y - ptsScreen[0].y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const ext = Math.max(width, height) * 1.5;
        ctx.lineWidth = isSelected ? 2.8 : 2;
        ctx.beginPath();
        ctx.moveTo(ptsScreen[0].x, ptsScreen[0].y);
        ctx.lineTo(ptsScreen[0].x + ux * ext, ptsScreen[0].y + uy * ext);
        ctx.stroke();
      } else if (obj.kind === 'angle2d' && ptsScreen.length >= 3) {
        const [pA, pV, pC] = ptsScreen;
        const drawRay = (from: Vec2, to: Vec2) => {
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const len = Math.hypot(dx, dy) || 1;
          const ext = Math.max(width, height) * 0.4;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.lineTo(from.x + (dx / len) * ext, from.y + (dy / len) * ext);
          ctx.stroke();
        };
        ctx.lineWidth = isSelected ? 2.8 : 2;
        drawRay(pV, pA);
        drawRay(pV, pC);

        // Angle arc
        const a1 = Math.atan2(pA.y - pV.y, pA.x - pV.x);
        const a2 = Math.atan2(pC.y - pV.y, pC.x - pV.x);
        let diff = a2 - a1;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const anticlockwise = diff < 0;
        const arcR = 28;
        ctx.beginPath();
        ctx.moveTo(pV.x, pV.y);
        ctx.arc(pV.x, pV.y, arcR, a1, a2, anticlockwise);
        ctx.closePath();
        ctx.globalAlpha = 0.18;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(pV.x, pV.y, arcR, a1, a2, anticlockwise);
        ctx.stroke();

        const deg = computeAngleDegrees2D(obj.points[0], obj.points[1], obj.points[2]);
        const midAngle = a1 + diff / 2;
        ctx.font = '600 12px "IBM Plex Mono", monospace';
        ctx.fillStyle = isDark ? '#F1F5F9' : '#0F172A';
        ctx.fillText(
          `${deg.toFixed(1)}°`,
          pV.x + Math.cos(midAngle) * (arcR + 18) - 14,
          pV.y + Math.sin(midAngle) * (arcR + 18) + 4,
        );
      }

      ctx.shadowBlur = 0;

      // Draw vertices / control handles & labels
      ptsScreen.forEach((pt, idx) => {
        const isHovered = hoveredHandle?.objId === obj.id && hoveredHandle?.idx === idx;
        const r = obj.kind === 'point2d' ? 5.5 : isSelected || isHovered ? 5.5 : 4;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fillStyle = obj.kind === 'point2d' ? obj.color : '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = obj.color;
        ctx.stroke();

        if (obj.showLabels && obj.pointLabels[idx]) {
          ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = isDark ? '#F8FAFC' : '#0F172A';
          ctx.fillText(obj.pointLabels[idx], pt.x + 8, pt.y - 8);
        }
      });

      ctx.restore();
    }

    // Draw Real-Time Overlapping Area Regions
    for (const region of intersections.regions) {
      ctx.save();
      ctx.fillStyle = 'rgba(220, 38, 38, 0.28)';
      for (const [a, b, c] of region.triangles) {
        const sa = worldToScreen(a.x, a.y, width, height);
        const sb = worldToScreen(b.x, b.y, width, height);
        const sc = worldToScreen(c.x, c.y, width, height);
        ctx.beginPath();
        ctx.moveTo(sa.x, sa.y);
        ctx.lineTo(sb.x, sb.y);
        ctx.lineTo(sc.x, sc.y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 2.4;
      for (const [ea, eb] of region.boundaryEdges) {
        const sa = worldToScreen(ea.x, ea.y, width, height);
        const sb = worldToScreen(eb.x, eb.y, width, height);
        ctx.beginPath();
        ctx.moveTo(sa.x, sa.y);
        ctx.lineTo(sb.x, sb.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw Real-Time Intersection Points
    for (const hit of intersections.points) {
      const sp = worldToScreen(hit.point.x, hit.point.y, width, height);
      ctx.save();
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(220, 38, 38, 0.22)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#DC2626';
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Compact coordinate label
      const coordTxt = `(${hit.point.x.toFixed(2)}, ${hit.point.y.toFixed(2)})`;
      ctx.font = '500 11px "IBM Plex Mono", monospace';
      const tw = ctx.measureText(coordTxt).width;
      ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(sp.x + 8, sp.y - 20, tw + 8, 17);
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(sp.x + 8, sp.y - 20, tw + 8, 17);
      ctx.fillStyle = '#DC2626';
      ctx.fillText(coordTxt, sp.x + 12, sp.y - 8);
      ctx.restore();
    }

    // Draw Custom Polygon Draft
    if (drawingCustomPolygon && customDraft.length > 0) {
      ctx.save();
      const screenDraft = customDraft.map((p) => worldToScreen(p.x, p.y, width, height));
      const cursorS = worldToScreen(cursorWorld.x, cursorWorld.y, width, height);

      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenDraft[0].x, screenDraft[0].y);
      for (let i = 1; i < screenDraft.length; i++) {
        ctx.lineTo(screenDraft[i].x, screenDraft[i].y);
      }
      ctx.lineTo(cursorS.x, cursorS.y);
      ctx.stroke();

      screenDraft.forEach((pt, idx) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, idx === 0 ? 6 : 4.5, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? '#0284C7' : '#FFFFFF';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#0284C7';
        ctx.stroke();
      });
      ctx.restore();
    }

    ctx.restore();
  }, [
    objects,
    selectedIds,
    intersections,
    showGrid,
    showAxes,
    isDark,
    zoom,
    pan,
    drawingCustomPolygon,
    customDraft,
    cursorWorld,
    hoveredHandle,
    screenToWorld,
    worldToScreen,
  ]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  useEffect(() => {
    const handleResize = () => renderCanvas();
    window.addEventListener('resize', handleResize);
    const el = containerRef.current;
    const ro = el ? new ResizeObserver(() => renderCanvas()) : null;
    if (el && ro) ro.observe(el);
    return () => {
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
    };
  }, [renderCanvas]);

  // Hit testing in screen pixels
  const hitTest = useCallback(
    (sx: number, sy: number, width: number, height: number) => {
      const worldPt = screenToWorld(sx, sy, width, height);

      // 1. Vertex / Radius handle priority
      for (let oi = objects.length - 1; oi >= 0; oi--) {
        const obj = objects[oi];
        if (!obj.visible) continue;

        if (obj.kind === 'circle2d' && obj.points[0] && obj.radius) {
          const edgeS = worldToScreen(obj.points[0].x + obj.radius, obj.points[0].y, width, height);
          if (Math.hypot(sx - edgeS.x, sy - edgeS.y) <= 11) {
            return { type: 'resize_circle' as const, objectId: obj.id };
          }
        }

        for (let vi = 0; vi < obj.points.length; vi++) {
          const ps = worldToScreen(obj.points[vi].x, obj.points[vi].y, width, height);
          if (Math.hypot(sx - ps.x, sy - ps.y) <= 10) {
            return { type: 'vertex' as const, objectId: obj.id, vertexIndex: vi };
          }
        }
      }

      // 2. Shape body or edge
      const worldTol = 10 / zoom;
      for (let oi = objects.length - 1; oi >= 0; oi--) {
        const obj = objects[oi];
        if (!obj.visible) continue;

        if (obj.kind === 'circle2d' && obj.points[0] && obj.radius) {
          if (dist2D(worldPt, obj.points[0]) <= obj.radius + worldTol) {
            return { type: 'object' as const, objectId: obj.id };
          }
        } else if (isPolygonKind(obj.kind) && obj.points.length >= 3) {
          if (pointInPolygon2D(worldPt, obj.points)) {
            return { type: 'object' as const, objectId: obj.id };
          }
          for (let k = 0; k < obj.points.length; k++) {
            if (
              distanceToSegment2D(
                worldPt,
                obj.points[k],
                obj.points[(k + 1) % obj.points.length],
              ) <= worldTol
            ) {
              return { type: 'object' as const, objectId: obj.id };
            }
          }
        } else if (obj.kind === 'segment2d' && obj.points.length >= 2) {
          if (distanceToSegment2D(worldPt, obj.points[0], obj.points[1]) <= worldTol) {
            return { type: 'object' as const, objectId: obj.id };
          }
        } else if (obj.kind === 'line2d' && obj.points.length >= 2) {
          if (distanceToLine2D(worldPt, obj.points[0], obj.points[1]) <= worldTol) {
            return { type: 'object' as const, objectId: obj.id };
          }
        } else if (obj.kind === 'ray2d' && obj.points.length >= 2) {
          if (distanceToRay2D(worldPt, obj.points[0], obj.points[1]) <= worldTol) {
            return { type: 'object' as const, objectId: obj.id };
          }
        } else if (obj.kind === 'angle2d' && obj.points.length >= 3) {
          if (
            distanceToRay2D(worldPt, obj.points[1], obj.points[0]) <= worldTol ||
            distanceToRay2D(worldPt, obj.points[1], obj.points[2]) <= worldTol
          ) {
            return { type: 'object' as const, objectId: obj.id };
          }
        }
      }
      return null;
    },
    [objects, screenToWorld, worldToScreen, zoom],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldPt = snap(screenToWorld(sx, sy, rect.width, rect.height));

    if (drawingCustomPolygon && e.button === 0) {
      if (customDraft.length >= 3) {
        const firstS = worldToScreen(customDraft[0].x, customDraft[0].y, rect.width, rect.height);
        if (Math.hypot(sx - firstS.x, sy - firstS.y) <= 12) {
          onFinishCustomPolygon(customDraft);
          setCustomDraft([]);
          return;
        }
      }
      setCustomDraft((prev) => [...prev, worldPt]);
      return;
    }

    if (e.button === 1 || e.button === 2) {
      dragRef.current = {
        mode: 'pan',
        startScreen: { x: e.clientX, y: e.clientY },
        lastWorld: worldPt,
        startPan: { ...pan },
        didMove: false,
      };
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    const hit = hitTest(sx, sy, rect.width, rect.height);
    if (!hit) {
      if (!e.shiftKey) onSelect([]);
      dragRef.current = {
        mode: 'pan',
        startScreen: { x: e.clientX, y: e.clientY },
        lastWorld: worldPt,
        startPan: { ...pan },
        didMove: false,
      };
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    // Selection handling
    if (e.shiftKey) {
      if (selectedIds.includes(hit.objectId)) {
        onSelect(selectedIds.filter((id) => id !== hit.objectId));
      } else {
        onSelect([...selectedIds, hit.objectId]);
      }
    } else if (!selectedIds.includes(hit.objectId)) {
      onSelect([hit.objectId]);
    }

    objectsSnapshotBeforeDrag.current = objects;

    if (hit.type === 'resize_circle') {
      dragRef.current = {
        mode: 'resize_circle',
        objectId: hit.objectId,
        startScreen: { x: e.clientX, y: e.clientY },
        lastWorld: worldPt,
        startPan: { ...pan },
        didMove: false,
      };
    } else if (hit.type === 'vertex') {
      dragRef.current = {
        mode: 'move_vertex',
        objectId: hit.objectId,
        vertexIndex: hit.vertexIndex,
        startScreen: { x: e.clientX, y: e.clientY },
        lastWorld: worldPt,
        startPan: { ...pan },
        didMove: false,
      };
    } else {
      dragRef.current = {
        mode: 'move_object',
        objectId: hit.objectId,
        startScreen: { x: e.clientX, y: e.clientY },
        lastWorld: worldPt,
        startPan: { ...pan },
        didMove: false,
      };
    }
    canvas.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const rawWorld = screenToWorld(sx, sy, rect.width, rect.height);
    const snapped = snap(rawWorld);
    setCursorWorld(snapped);

    const drag = dragRef.current;
    if (!drag) {
      const hit = hitTest(sx, sy, rect.width, rect.height);
      if (hit && hit.type === 'vertex') {
        setHoveredHandle({ objId: hit.objectId, idx: hit.vertexIndex });
        canvas.style.cursor = 'grab';
      } else if (hit && hit.type === 'resize_circle') {
        setHoveredHandle(null);
        canvas.style.cursor = 'ew-resize';
      } else if (hit) {
        setHoveredHandle(null);
        canvas.style.cursor = 'move';
      } else {
        setHoveredHandle(null);
        canvas.style.cursor = drawingCustomPolygon ? 'crosshair' : 'default';
      }
      return;
    }

    if (drag.mode === 'pan') {
      const dx = e.clientX - drag.startScreen.x;
      const dy = e.clientY - drag.startScreen.y;
      if (Math.hypot(dx, dy) > 2) drag.didMove = true;
      setPan({ x: drag.startPan.x + dx, y: drag.startPan.y + dy });
      return;
    }

    const dx = snapped.x - drag.lastWorld.x;
    const dy = snapped.y - drag.lastWorld.y;
    if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return;
    drag.didMove = true;
    drag.lastWorld = snapped;

    if (drag.mode === 'move_vertex' && drag.objectId && drag.vertexIndex !== undefined) {
      const targetId = drag.objectId;
      const vIdx = drag.vertexIndex;
      onUpdateObjects(
        (prev) =>
          prev.map((o) =>
            o.id === targetId
              ? {
                  ...o,
                  points: o.points.map((pt, i) => (i === vIdx ? snapped : pt)),
                }
              : o,
          ),
        false,
      );
    } else if (drag.mode === 'resize_circle' && drag.objectId) {
      const targetId = drag.objectId;
      onUpdateObjects(
        (prev) =>
          prev.map((o) => {
            if (o.id !== targetId || !o.points[0]) return o;
            const r = Math.max(0.25, dist2D(o.points[0], snapped));
            return { ...o, radius: Number(r.toFixed(2)) };
          }),
        false,
      );
    } else if (drag.mode === 'move_object' && drag.objectId) {
      const moveSet = selectedIds.includes(drag.objectId) ? selectedIds : [drag.objectId];
      onUpdateObjects(
        (prev) =>
          prev.map((o) =>
            moveSet.includes(o.id)
              ? {
                  ...o,
                  points: o.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })),
                }
              : o,
          ),
        false,
      );
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (drag && drag.didMove && drag.mode !== 'pan' && objectsSnapshotBeforeDrag.current) {
      // Commit final state to history stack cleanly
      onUpdateObjects((curr) => curr, true);
    }
    dragRef.current = null;
    objectsSnapshotBeforeDrag.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if not captured
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const worldBefore = screenToWorld(sx, sy, rect.width, rect.height);
    const factor = e.deltaY < 0 ? 1.1 : 0.91;
    const nextZoom = Math.min(220, Math.max(18, zoom * factor));
    setZoom(nextZoom);
    setPan({
      x: sx - rect.width / 2 - worldBefore.x * nextZoom,
      y: sy - rect.height / 2 + worldBefore.y * nextZoom,
    });
  };

  const selectedObj =
    selectedIds.length === 1 ? objects.find((o) => o.id === selectedIds[0]) : undefined;

  const rotateSelected = (deg: number) => {
    if (selectedIds.length === 0) return;
    const rad = (deg * Math.PI) / 180;
    onUpdateObjects(
      (prev) =>
        prev.map((o) => {
          if (!selectedIds.includes(o.id)) return o;
          const c = polygonCentroid2D(o.points);
          return { ...o, points: rotatePoints2D(o.points, c, rad) };
        }),
      true,
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={() => {
          if (drawingCustomPolygon && customDraft.length >= 3) {
            onFinishCustomPolygon(customDraft);
            setCustomDraft([]);
          }
        }}
        onWheel={handleWheel}
        className="block w-full h-full touch-none"
      />

      {/* Custom Polygon Drawing Banner */}
      {drawingCustomPolygon && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-sky-500/40 shadow-sm text-xs font-medium">
          <span className="text-slate-700 dark:text-slate-200 whitespace-nowrap">
            Nhấp lên vùng vẽ để đặt các đỉnh đa giác ({customDraft.length} đỉnh)
          </span>
          {customDraft.length >= 3 && (
            <button
              onClick={() => {
                onFinishCustomPolygon(customDraft);
                setCustomDraft([]);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
            >
              <Check className="w-3.5 h-3.5" /> Hoàn thành
            </button>
          )}
          <button
            onClick={() => {
              setCustomDraft([]);
              onCancelCustomPolygon();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <X className="w-3.5 h-3.5" /> Hủy
          </button>
        </div>
      )}

      {/* Contextual Floating Bar for Selected 2D Object */}
      {selectedIds.length > 0 && !drawingCustomPolygon && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 max-w-[calc(100%-1rem)] flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-sm text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-200 pr-2 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap max-w-[110px] sm:max-w-[180px] truncate">
            {selectedObj ? selectedObj.name : `${selectedIds.length} đối tượng`}
          </span>
          <button
            onClick={() => rotateSelected(-15)}
            title="Xoay trái 15°"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => rotateSelected(15)}
            title="Xoay phải 15°"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDeleteSelected}
            title="Xóa (Delete)"
            className="flex items-center gap-1 px-2 py-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 font-medium whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" /> Xóa
          </button>
        </div>
      )}

      {/* Quiet Coordinate Readout Bottom-Left */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400">
        x: {cursorWorld.x.toFixed(2)} · y: {cursorWorld.y.toFixed(2)}
      </div>
    </div>
  );
});
