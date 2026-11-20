import React, { useState } from 'react';
import {
  Circle,
  Compass,
  Dot,
  Hexagon,
  Minus,
  MoveUpRight,
  Pentagon,
  RectangleHorizontal,
  SlidersHorizontal,
  Square,
  Triangle,
  Box,
  Pyramid,
  Cylinder,
  Cone,
  Globe,
  Layers,
} from 'lucide-react';
import { Geo2DKind, Geo3DKind, WorkspaceMode } from '../types/geometry';

export interface QuickCreationDims {
  width: number;
  height: number;
  radius: number;
}

interface ToolPaletteProps {
  mode: WorkspaceMode;
  drawingCustomPolygon: boolean;
  quickDims: QuickCreationDims;
  onChangeQuickDims: (dims: QuickCreationDims) => void;
  onCreate2D: (kind: Geo2DKind) => void;
  onCreate3D: (kind: Geo3DKind) => void;
}

export function ToolPalette({
  mode,
  drawingCustomPolygon,
  quickDims,
  onChangeQuickDims,
  onCreate2D,
  onCreate3D,
}: ToolPaletteProps) {
  const [dimsOpen, setDimsOpen] = useState(false);

  const tools2DGroups: {
    group: string;
    items: { kind: Geo2DKind; label: string; icon: React.ReactNode }[];
  }[] = [
    {
      group: 'Cơ bản',
      items: [
        { kind: 'point2d', label: 'Điểm', icon: <Dot className="w-3.5 h-3.5" /> },
        { kind: 'segment2d', label: 'Đoạn thẳng', icon: <Minus className="w-3.5 h-3.5" /> },
        { kind: 'line2d', label: 'Đường thẳng', icon: <Minus className="w-3.5 h-3.5 -rotate-45" /> },
        { kind: 'ray2d', label: 'Tia', icon: <MoveUpRight className="w-3.5 h-3.5" /> },
        { kind: 'angle2d', label: 'Góc', icon: <Compass className="w-3.5 h-3.5" /> },
        { kind: 'circle2d', label: 'Đường tròn', icon: <Circle className="w-3.5 h-3.5" /> },
      ],
    },
    {
      group: 'Tam giác',
      items: [
        { kind: 'triangle', label: 'TG thường', icon: <Triangle className="w-3.5 h-3.5" /> },
        { kind: 'right_triangle', label: 'TG vuông', icon: <Triangle className="w-3.5 h-3.5" /> },
        { kind: 'isosceles_triangle', label: 'TG cân', icon: <Triangle className="w-3.5 h-3.5" /> },
        { kind: 'equilateral_triangle', label: 'TG đều', icon: <Triangle className="w-3.5 h-3.5" /> },
      ],
    },
    {
      group: 'Tứ giác & Đa giác',
      items: [
        { kind: 'square', label: 'Hình vuông', icon: <Square className="w-3.5 h-3.5" /> },
        { kind: 'rectangle', label: 'Chữ nhật', icon: <RectangleHorizontal className="w-3.5 h-3.5" /> },
        { kind: 'trapezoid', label: 'Hình thang', icon: <Hexagon className="w-3.5 h-3.5" /> },
        { kind: 'right_trapezoid', label: 'Thang vuông', icon: <Hexagon className="w-3.5 h-3.5" /> },
        { kind: 'isosceles_trapezoid', label: 'Thang cân', icon: <Hexagon className="w-3.5 h-3.5" /> },
        { kind: 'parallelogram', label: 'Bình hành', icon: <Pentagon className="w-3.5 h-3.5" /> },
        { kind: 'rhombus', label: 'Hình thoi', icon: <Square className="w-3.5 h-3.5 rotate-45" /> },
        { kind: 'custom_polygon', label: 'Đa giác tùy ý', icon: <Pentagon className="w-3.5 h-3.5" /> },
      ],
    },
  ];

  const tools3DGroups: {
    group: string;
    items: { kind: Geo3DKind; label: string; icon: React.ReactNode }[];
  }[] = [
    {
      group: 'Cơ bản',
      items: [
        { kind: 'point3d', label: 'Điểm 3D', icon: <Dot className="w-3.5 h-3.5" /> },
        { kind: 'line3d', label: 'Đường thẳng', icon: <Minus className="w-3.5 h-3.5 -rotate-45" /> },
        { kind: 'plane3d', label: 'Mặt phẳng', icon: <Layers className="w-3.5 h-3.5" /> },
      ],
    },
    {
      group: 'Khối đa diện',
      items: [
        { kind: 'pyramid_tri', label: 'Chóp tam giác', icon: <Pyramid className="w-3.5 h-3.5" /> },
        { kind: 'pyramid_quad', label: 'Chóp tứ giác', icon: <Pyramid className="w-3.5 h-3.5" /> },
        { kind: 'tetrahedron', label: 'Tứ diện đều', icon: <Triangle className="w-3.5 h-3.5" /> },
        { kind: 'cube', label: 'Lập phương', icon: <Box className="w-3.5 h-3.5" /> },
        { kind: 'box', label: 'Hộp chữ nhật', icon: <Box className="w-3.5 h-3.5" /> },
        { kind: 'prism_right', label: 'Lăng trụ đứng', icon: <Hexagon className="w-3.5 h-3.5" /> },
        { kind: 'prism_oblique', label: 'Lăng trụ xiên', icon: <Hexagon className="w-3.5 h-3.5" /> },
      ],
    },
    {
      group: 'Khối tròn xoay',
      items: [
        { kind: 'cylinder', label: 'Hình trụ', icon: <Cylinder className="w-3.5 h-3.5" /> },
        { kind: 'cone', label: 'Hình nón', icon: <Cone className="w-3.5 h-3.5" /> },
        { kind: 'sphere', label: 'Hình cầu', icon: <Globe className="w-3.5 h-3.5" /> },
      ],
    },
  ];

  return (
    <div className="relative px-3 py-1.5 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 shrink-0 z-20 overflow-x-auto">
      <div className="flex items-center gap-3">
        {mode === '2d'
          ? tools2DGroups.map((grp, gi) => (
              <React.Fragment key={grp.group}>
                {gi > 0 && <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 shrink-0" />}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mr-1 whitespace-nowrap">
                    {grp.group}
                  </span>
                  {grp.items.map((item) => {
                    const isCustomActive =
                      item.kind === 'custom_polygon' && drawingCustomPolygon;
                    return (
                      <button
                        key={item.kind}
                        onClick={() => onCreate2D(item.kind)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                          isCustomActive
                            ? 'bg-sky-600 text-white'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </React.Fragment>
            ))
          : tools3DGroups.map((grp, gi) => (
              <React.Fragment key={grp.group}>
                {gi > 0 && <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 shrink-0" />}
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mr-1 whitespace-nowrap">
                    {grp.group}
                  </span>
                  {grp.items.map((item) => (
                    <button
                      key={item.kind}
                      onClick={() => onCreate3D(item.kind)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 whitespace-nowrap shrink-0 transition-colors"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </React.Fragment>
            ))}
      </div>

      {/* Quick Size Parameters Popover */}
      <div className="relative shrink-0">
        <button
          onClick={() => setDimsOpen((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border whitespace-nowrap shrink-0 transition-colors ${
            dimsOpen
              ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Kích thước tạo nhanh</span>
        </button>

        {dimsOpen && (
          <div className="fixed right-4 top-24 w-64 p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg z-50 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                Thông số mặc định khi tạo
              </span>
              <button
                onClick={() => setDimsOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Đóng
              </button>
            </div>

            <label className="block space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Cạnh đáy / Chiều rộng</span>
                <span className="font-mono font-semibold">{quickDims.width.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1"
                max="7"
                step="0.2"
                value={quickDims.width}
                onChange={(e) =>
                  onChangeQuickDims({ ...quickDims, width: parseFloat(e.target.value) })
                }
                className="w-full geosim-slider bg-slate-200 dark:bg-slate-700"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Chiều cao (h)</span>
                <span className="font-mono font-semibold">{quickDims.height.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1"
                max="7"
                step="0.2"
                value={quickDims.height}
                onChange={(e) =>
                  onChangeQuickDims({ ...quickDims, height: parseFloat(e.target.value) })
                }
                className="w-full geosim-slider bg-slate-200 dark:bg-slate-700"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Bán kính (R)</span>
                <span className="font-mono font-semibold">{quickDims.radius.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4"
                step="0.1"
                value={quickDims.radius}
                onChange={(e) =>
                  onChangeQuickDims({ ...quickDims, radius: parseFloat(e.target.value) })
                }
                className="w-full geosim-slider bg-slate-200 dark:bg-slate-700"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
