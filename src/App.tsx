import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Canvas2D, Canvas2DHandle } from './components/Canvas2D';
import { Canvas3D, Canvas3DHandle } from './components/Canvas3D';
import { RightSidebar } from './components/RightSidebar';
import { QuickCreationDims, ToolPalette } from './components/ToolPalette';
import { TopBar } from './components/TopBar';
import { PRESETS_2D, PRESETS_3D } from './data/presets';
import { compute2DIntersections, makeDefault2DObject } from './math/geometry2d';
import {
  buildSolidGeometry,
  compute3DIntersections,
  is3DSolidKind,
  makeDefault3DObject,
  SolidMeshBuildResult,
} from './math/geometry3d';
import {
  Geo2DKind,
  Geo2DObject,
  Geo3DKind,
  Geo3DObject,
  TransformMode,
  Vec2,
  WorkspaceMode,
} from './types/geometry';

const MAX_HISTORY = 40;

export default function App() {
  const [mode, setMode] = useState<WorkspaceMode>('3d');
  const [isDark, setIsDark] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  );
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [drawingCustomPolygon, setDrawingCustomPolygon] = useState<boolean>(false);

  const [quickDims, setQuickDims] = useState<QuickCreationDims>({
    width: 3.4,
    height: 3.8,
    radius: 1.6,
  });

  // 2D & 3D Object Lists
  const [objects2D, setObjects2D] = useState<Geo2DObject[]>(() => PRESETS_2D[0].build());
  const [objects3D, setObjects3D] = useState<Geo3DObject[]>(() => PRESETS_3D[0].build());

  // Selected IDs per mode
  const [selected2DIds, setSelected2DIds] = useState<string[]>([]);
  const [selected3DIds, setSelected3DIds] = useState<string[]>(() =>
    objects3D[1] ? [objects3D[1].id] : [],
  );

  // Undo / Redo Stacks per mode
  const [past2D, setPast2D] = useState<Geo2DObject[][]>([]);
  const [future2D, setFuture2D] = useState<Geo2DObject[][]>([]);
  const [past3D, setPast3D] = useState<Geo3DObject[][]>([]);
  const [future3D, setFuture3D] = useState<Geo3DObject[][]>([]);

  const canvas2DRef = useRef<Canvas2DHandle>(null);
  const canvas3DRef = useRef<Canvas3DHandle>(null);

  // Sync Dark Class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Ref snapshot for drag-commit history
  const preDrag3DSnapshot = useRef<Geo3DObject[] | null>(null);
  const preDrag2DSnapshot = useRef<Geo2DObject[] | null>(null);

  const commit2D = useCallback((nextOrUpdater: Geo2DObject[] | ((prev: Geo2DObject[]) => Geo2DObject[]), recordHistory = true) => {
    setObjects2D((prev) => {
      const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(prev) : nextOrUpdater;
      if (recordHistory) {
        const snapshot = preDrag2DSnapshot.current ?? prev;
        preDrag2DSnapshot.current = null;
        setPast2D((p) => [...p.slice(-(MAX_HISTORY - 1)), snapshot]);
        setFuture2D([]);
      } else if (!preDrag2DSnapshot.current) {
        preDrag2DSnapshot.current = prev;
      }
      return next;
    });
  }, []);

  const commit3D = useCallback((nextOrUpdater: Geo3DObject[] | ((prev: Geo3DObject[]) => Geo3DObject[]), recordHistory = true) => {
    setObjects3D((prev) => {
      const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(prev) : nextOrUpdater;
      if (recordHistory) {
        const snapshot = preDrag3DSnapshot.current ?? prev;
        preDrag3DSnapshot.current = null;
        setPast3D((p) => [...p.slice(-(MAX_HISTORY - 1)), snapshot]);
        setFuture3D([]);
      } else if (!preDrag3DSnapshot.current) {
        preDrag3DSnapshot.current = prev;
      }
      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (mode === '2d') {
      setPast2D((prevPast) => {
        if (prevPast.length === 0) return prevPast;
        const previous = prevPast[prevPast.length - 1];
        setObjects2D((curr) => {
          setFuture2D((f) => [curr, ...f.slice(0, MAX_HISTORY - 1)]);
          return previous;
        });
        setSelected2DIds([]);
        return prevPast.slice(0, -1);
      });
    } else {
      setPast3D((prevPast) => {
        if (prevPast.length === 0) return prevPast;
        const previous = prevPast[prevPast.length - 1];
        setObjects3D((curr) => {
          setFuture3D((f) => [curr, ...f.slice(0, MAX_HISTORY - 1)]);
          return previous;
        });
        setSelected3DIds([]);
        return prevPast.slice(0, -1);
      });
    }
  }, [mode]);

  const handleRedo = useCallback(() => {
    if (mode === '2d') {
      setFuture2D((prevFuture) => {
        if (prevFuture.length === 0) return prevFuture;
        const [next, ...rest] = prevFuture;
        setObjects2D((curr) => {
          setPast2D((p) => [...p.slice(-(MAX_HISTORY - 1)), curr]);
          return next;
        });
        setSelected2DIds([]);
        return rest;
      });
    } else {
      setFuture3D((prevFuture) => {
        if (prevFuture.length === 0) return prevFuture;
        const [next, ...rest] = prevFuture;
        setObjects3D((curr) => {
          setPast3D((p) => [...p.slice(-(MAX_HISTORY - 1)), curr]);
          return next;
        });
        setSelected3DIds([]);
        return rest;
      });
    }
  }, [mode]);

  const handleDeleteSelected = useCallback(() => {
    if (mode === '2d') {
      if (selected2DIds.length === 0) return;
      commit2D((prev) => prev.filter((o) => !selected2DIds.includes(o.id)), true);
      setSelected2DIds([]);
    } else {
      if (selected3DIds.length === 0) return;
      commit3D((prev) => prev.filter((o) => !selected3DIds.includes(o.id)), true);
      setSelected3DIds([]);
    }
  }, [mode, selected2DIds, selected3DIds, commit2D, commit3D]);

  // Global Keyboard Shortcuts (Delete, Backspace, Ctrl+Z, Ctrl+Y, G/R/S)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
        return;
      }
      if (mode === '3d') {
        const k = e.key.toLowerCase();
        if (k === 'g') setTransformMode('translate');
        else if (k === 'r') setTransformMode('rotate');
        else if (k === 's') setTransformMode('scale');
        else if (k === 'escape') setSelected3DIds([]);
      } else if (e.key === 'Escape') {
        setDrawingCustomPolygon(false);
        setSelected2DIds([]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, handleUndo, handleRedo, handleDeleteSelected]);

  // Creation handlers
  const handleCreate2D = useCallback(
    (kind: Geo2DKind) => {
      if (kind === 'custom_polygon') {
        setDrawingCustomPolygon((v) => !v);
        return;
      }
      setDrawingCustomPolygon(false);
      const created = makeDefault2DObject(kind, objects2D.length, {
        size: quickDims.width,
        width: quickDims.width,
        height: quickDims.height,
        radius: quickDims.radius,
      });
      commit2D((prev) => [...prev, created], true);
      setSelected2DIds([created.id]);
    },
    [objects2D.length, quickDims, commit2D],
  );

  const handleFinishCustomPolygon = useCallback(
    (points: Vec2[]) => {
      const created = makeDefault2DObject('custom_polygon', objects2D.length, { points });
      commit2D((prev) => [...prev, created], true);
      setSelected2DIds([created.id]);
      setDrawingCustomPolygon(false);
    },
    [objects2D.length, commit2D],
  );

  const handleCreate3D = useCallback(
    (kind: Geo3DKind) => {
      const solidCount = objects3D.filter((o) => is3DSolidKind(o.kind)).length;
      const offsetPos =
        is3DSolidKind(kind) && solidCount > 0
          ? { x: ((solidCount % 3) - 1) * 2.4, y: 0, z: Math.floor(solidCount / 3) * 2.2 }
          : undefined;

      const created = makeDefault3DObject(
        kind,
        objects3D.length,
        {
          width: quickDims.width,
          height: quickDims.height,
          depth: quickDims.width * 0.8,
          radius: quickDims.radius,
        },
        offsetPos,
      );
      commit3D((prev) => [...prev, created], true);
      setSelected3DIds([created.id]);
    },
    [objects3D, quickDims, commit3D],
  );

  const handleClearAll = useCallback(() => {
    if (mode === '2d') {
      if (objects2D.length === 0) return;
      commit2D([], true);
      setSelected2DIds([]);
      setDrawingCustomPolygon(false);
    } else {
      if (objects3D.length === 0) return;
      commit3D([], true);
      setSelected3DIds([]);
    }
  }, [mode, objects2D.length, objects3D.length, commit2D, commit3D]);

  const handleSelectPreset2D = useCallback(
    (presetId: string) => {
      const preset = PRESETS_2D.find((p) => p.id === presetId);
      if (!preset) return;
      const built = preset.build();
      commit2D(built, true);
      setSelected2DIds(built[0] ? [built[0].id] : []);
      setDrawingCustomPolygon(false);
    },
    [commit2D],
  );

  const handleSelectPreset3D = useCallback(
    (presetId: string) => {
      const preset = PRESETS_3D.find((p) => p.id === presetId);
      if (!preset) return;
      const built = preset.build();
      commit3D(built, true);
      setSelected3DIds(built[1] ? [built[1].id] : built[0] ? [built[0].id] : []);
    },
    [commit3D],
  );

  const handleUpdate3DTransform = useCallback(
    (
      id: string,
      pos: { x: number; y: number; z: number },
      rot: { x: number; y: number; z: number },
      scale: { x: number; y: number; z: number },
      commitHistory: boolean,
    ) => {
      commit3D(
        (prev) =>
          prev.map((o) =>
            o.id === id ? { ...o, position: pos, rotation: rot, scale } : o,
          ),
        commitHistory,
      );
    },
    [commit3D],
  );

  const handleToggleVisibility = useCallback(
    (id: string) => {
      if (mode === '2d') {
        commit2D((prev) => prev.map((o) => (o.id === id ? { ...o, visible: !o.visible } : o)), true);
      } else {
        commit3D((prev) => prev.map((o) => (o.id === id ? { ...o, visible: !o.visible } : o)), true);
      }
    },
    [mode, commit2D, commit3D],
  );

  const handleDeleteObject = useCallback(
    (id: string) => {
      if (mode === '2d') {
        commit2D((prev) => prev.filter((o) => o.id !== id), true);
        setSelected2DIds((s) => s.filter((x) => x !== id));
      } else {
        commit3D((prev) => prev.filter((o) => o.id !== id), true);
        setSelected3DIds((s) => s.filter((x) => x !== id));
      }
    },
    [mode, commit2D, commit3D],
  );

  const handleUpdate2DPatch = useCallback(
    (id: string, patch: Partial<Geo2DObject>) => {
      commit2D((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)), true);
    },
    [commit2D],
  );

  const handleUpdate3DPatch = useCallback(
    (id: string, patch: Partial<Geo3DObject>) => {
      commit3D((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)), true);
    },
    [commit3D],
  );

  // Real-time 2D Intersections
  const intersections2D = useMemo(() => compute2DIntersections(objects2D), [objects2D]);

  // Cached 3D Solid Meshes + Real-time 3D Intersections
  const solidMeshCacheRef = useRef<Map<string, { sig: string; data: SolidMeshBuildResult }>>(
    new Map(),
  );

  const intersections3D = useMemo(() => {
    const activeCache = new Map<string, SolidMeshBuildResult>();
    const activeIds = new Set<string>();
    for (const obj of objects3D) {
      if (!is3DSolidKind(obj.kind)) continue;
      activeIds.add(obj.id);
      const sig = `${obj.kind}|${JSON.stringify(obj.dimensions)}`;
      const cached = solidMeshCacheRef.current.get(obj.id);
      if (cached && cached.sig === sig) {
        activeCache.set(obj.id, cached.data);
      } else {
        if (cached) {
          cached.data.geometry.dispose();
          cached.data.edgeGeometry.dispose();
        }
        const built = buildSolidGeometry(obj);
        solidMeshCacheRef.current.set(obj.id, { sig, data: built });
        activeCache.set(obj.id, built);
      }
    }
    // Prune deleted cache entries
    solidMeshCacheRef.current.forEach((val, key) => {
      if (!activeIds.has(key)) {
        val.data.geometry.dispose();
        val.data.edgeGeometry.dispose();
        solidMeshCacheRef.current.delete(key);
      }
    });

    return compute3DIntersections(objects3D, activeCache);
  }, [objects3D]);

  const handleExportPng = useCallback(() => {
    if (mode === '2d') canvas2DRef.current?.exportPng();
    else canvas3DRef.current?.exportPng();
  }, [mode]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <TopBar
        mode={mode}
        onChangeMode={(m) => {
          setMode(m);
          setDrawingCustomPolygon(false);
        }}
        canUndo={mode === '2d' ? past2D.length > 0 : past3D.length > 0}
        canRedo={mode === '2d' ? future2D.length > 0 : future3D.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid((v) => !v)}
        showAxes={showAxes}
        onToggleAxes={() => setShowAxes((v) => !v)}
        snapToGrid={snapToGrid}
        onToggleSnap={() => setSnapToGrid((v) => !v)}
        isDark={isDark}
        onToggleDark={() => setIsDark((v) => !v)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onClearAll={handleClearAll}
        onExportPng={handleExportPng}
        onSelectPreset2D={handleSelectPreset2D}
        onSelectPreset3D={handleSelectPreset3D}
      />

      <ToolPalette
        mode={mode}
        drawingCustomPolygon={drawingCustomPolygon}
        quickDims={quickDims}
        onChangeQuickDims={setQuickDims}
        onCreate2D={handleCreate2D}
        onCreate3D={handleCreate3D}
      />

      {/* Main Workspace: Responsive Canvas + Collapsible Properties Panel */}
      <main className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 min-h-0 relative">
          {mode === '2d' ? (
            <Canvas2D
              ref={canvas2DRef}
              objects={objects2D}
              selectedIds={selected2DIds}
              intersections={intersections2D}
              showGrid={showGrid}
              showAxes={showAxes}
              snapToGrid={snapToGrid}
              isDark={isDark}
              drawingCustomPolygon={drawingCustomPolygon}
              onFinishCustomPolygon={handleFinishCustomPolygon}
              onCancelCustomPolygon={() => setDrawingCustomPolygon(false)}
              onSelect={setSelected2DIds}
              onUpdateObjects={commit2D}
              onDeleteSelected={handleDeleteSelected}
            />
          ) : (
            <Canvas3D
              ref={canvas3DRef}
              objects={objects3D}
              selectedIds={selected3DIds}
              transformMode={transformMode}
              intersections={intersections3D}
              showGrid={showGrid}
              showAxes={showAxes}
              isDark={isDark}
              onChangeTransformMode={setTransformMode}
              onSelect={setSelected3DIds}
              onUpdateObjectTransform={handleUpdate3DTransform}
              onDeleteSelected={handleDeleteSelected}
            />
          )}

          {/* Mobile quick button to open Properties Panel when hidden */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-sm text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Thuộc tính</span>
            </button>
          )}
        </div>

        {sidebarOpen && (
          <RightSidebar
            mode={mode}
            objects2D={objects2D}
            objects3D={objects3D}
            selectedIds={mode === '2d' ? selected2DIds : selected3DIds}
            intersections2D={intersections2D}
            intersections3D={intersections3D}
            onSelect={mode === '2d' ? setSelected2DIds : setSelected3DIds}
            onToggleVisibility={handleToggleVisibility}
            onDeleteObject={handleDeleteObject}
            onClearAll={handleClearAll}
            onUpdate2D={handleUpdate2DPatch}
            onUpdate3D={handleUpdate3DPatch}
            onClose={() => setSidebarOpen(false)}
          />
        )}
      </main>
    </div>
  );
}
