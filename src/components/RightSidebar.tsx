import React, { useState } from 'react';
import { ChevronDown, Eye, EyeOff, Trash2 } from 'lucide-react';
import {
  computeAngleDegrees2D,
  dist2D,
  isPolygonKind,
  polygonArea2D,
  polygonPerimeter2D,
} from '../math/geometry2d';
import { is3DSolidKind } from '../math/geometry3d';
import {
  Geo2DObject,
  Geo3DObject,
  Intersection2DSummary,
  Intersection3DSummary,
  SHAPE_COLORS,
  WorkspaceMode,
} from '../types/geometry';

interface RightSidebarProps {
  mode: WorkspaceMode;
  objects2D: Geo2DObject[];
  objects3D: Geo3DObject[];
  selectedIds: string[];
  intersections2D: Intersection2DSummary;
  intersections3D: Intersection3DSummary;
  onSelect: (ids: string[]) => void;
  onToggleVisibility: (id: string) => void;
  onDeleteObject: (id: string) => void;
  onClearAll: () => void;
  onUpdate2D: (id: string, patch: Partial<Geo2DObject>) => void;
  onUpdate3D: (id: string, patch: Partial<Geo3DObject>) => void;
  onClose: () => void;
}

export function RightSidebar({
  mode,
  objects2D,
  objects3D,
  selectedIds,
  intersections2D,
  intersections3D,
  onSelect,
  onToggleVisibility,
  onDeleteObject,
  onClearAll,
  onUpdate2D,
  onUpdate3D,
  onClose,
}: RightSidebarProps) {
  const [mobileTab, setMobileTab] = useState<'objects' | 'properties' | 'intersections'>('properties');
  const list = mode === '3d' ? objects3D : objects2D;
  const primaryId = selectedIds.length === 1 ? selectedIds[0] : null;
  const selected2D = mode === '2d' && primaryId ? objects2D.find((o) => o.id === primaryId) : null;
  const selected3D = mode === '3d' && primaryId ? objects3D.find((o) => o.id === primaryId) : null;

  const radToDeg = (r: number) => Math.round((r * 180) / Math.PI);
  const degToRad = (d: number) => (d * Math.PI) / 180;
  const intersectionCount =
    mode === '3d'
      ? intersections3D.crossSections.length +
        intersections3D.planeLines.length +
        intersections3D.lineHits.length +
        intersections3D.solidSeams.length
      : intersections2D.points.length + intersections2D.regions.length;

  return (
    <aside className="w-full h-[44dvh] md:h-full md:w-76 xl:w-80 shrink-0 bg-white dark:bg-slate-900 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden select-none">
      {/* Mobile-only Tab & Hide Bar */}
      <div className="md:hidden px-2.5 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950 shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setMobileTab('properties')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              mobileTab === 'properties'
                ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Thuộc tính
          </button>
          <button
            onClick={() => setMobileTab('objects')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              mobileTab === 'objects'
                ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Đối tượng ({list.length})
          </button>
          <button
            onClick={() => setMobileTab('intersections')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              mobileTab === 'intersections'
                ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Giao tuyến ({intersectionCount})
          </button>
        </div>

        <button
          onClick={onClose}
          title="Ẩn khung thuộc tính"
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          <span>Ẩn</span>
        </button>
      </div>

      {/* 1. Object Layer Tree */}
      <div
        className={`p-3.5 border-b border-slate-200 dark:border-slate-800 flex-col md:max-h-[36%] flex-1 md:flex-none overflow-hidden ${
          mobileTab === 'objects' ? 'flex' : 'hidden md:flex'
        }`}
      >
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="font-display text-xs font-semibold text-slate-800 dark:text-slate-100">
            Danh sách đối tượng ({list.length})
          </h2>
          {list.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-[11px] font-medium text-red-600 hover:text-red-700 dark:text-red-400"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {list.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
            Chưa có hình nào. Chọn công cụ ở thanh trên để bắt đầu.
          </div>
        ) : (
          <div className="overflow-y-auto space-y-1 pr-0.5">
            {list.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={(e) => {
                    if (e.shiftKey) {
                      onSelect(
                        isSelected
                          ? selectedIds.filter((id) => id !== item.id)
                          : [...selectedIds, item.id],
                      );
                    } else {
                      onSelect([item.id]);
                    }
                  }}
                  className={`group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate font-medium">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(item.id);
                      }}
                      title={item.visible ? 'Ẩn hình' : 'Hiện hình'}
                      className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                    >
                      {item.visible ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 opacity-50" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteObject(item.id);
                      }}
                      title="Xóa"
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/60 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Quick Properties Inspector */}
      <div
        className={`p-3.5 md:border-b border-slate-200 dark:border-slate-800 overflow-y-auto flex-1 space-y-3.5 ${
          mobileTab === 'properties' ? 'block' : 'hidden md:block'
        }`}
      >
        <h2 className="hidden md:block font-display text-xs font-semibold text-slate-800 dark:text-slate-100">
          Thuộc tính đối tượng
        </h2>

        {!selected2D && !selected3D ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
            {selectedIds.length > 1
              ? `Đang chọn ${selectedIds.length} đối tượng. Chọn 1 đối tượng để chỉnh thuộc tính chi tiết.`
              : 'Nhấp vào một hình trên vùng vẽ hoặc danh sách để chỉnh màu, độ trong suốt, tọa độ và kích thước.'}
          </p>
        ) : (
          <div className="space-y-3 text-xs">
            {/* Name */}
            <div>
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Tên hiển thị
              </label>
              <input
                type="text"
                value={(selected2D ?? selected3D)!.name}
                onChange={(e) => {
                  if (selected2D) onUpdate2D(selected2D.id, { name: e.target.value });
                  if (selected3D) onUpdate3D(selected3D.id, { name: e.target.value });
                }}
                className="w-full px-2.5 py-1.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Color Swatches */}
            <div>
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Màu sắc
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {SHAPE_COLORS.map((hex) => {
                  const active = (selected2D ?? selected3D)!.color === hex;
                  return (
                    <button
                      key={hex}
                      onClick={() => {
                        if (selected2D) onUpdate2D(selected2D.id, { color: hex });
                        if (selected3D) onUpdate3D(selected3D.id, { color: hex });
                      }}
                      className={`w-5 h-5 rounded-md transition-transform ${
                        active ? 'ring-2 ring-offset-1 ring-sky-600 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Opacity */}
            <div>
              <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                <span>Độ đậm / Trong suốt</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">
                  {Math.round((selected2D ?? selected3D)!.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.02"
                value={(selected2D ?? selected3D)!.opacity}
                onChange={(e) => {
                  const opacity = parseFloat(e.target.value);
                  if (selected2D) onUpdate2D(selected2D.id, { opacity });
                  if (selected3D) onUpdate3D(selected3D.id, { opacity });
                }}
                className="w-full geosim-slider bg-slate-200 dark:bg-slate-700"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-1.5 pt-1">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-600 dark:text-slate-300">Hiển thị tên đỉnh</span>
                <input
                  type="checkbox"
                  checked={(selected2D ?? selected3D)!.showLabels}
                  onChange={(e) => {
                    if (selected2D) onUpdate2D(selected2D.id, { showLabels: e.target.checked });
                    if (selected3D) onUpdate3D(selected3D.id, { showLabels: e.target.checked });
                  }}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-slate-600 dark:text-slate-300">
                  Tự động tính giao tuyến
                </span>
                <input
                  type="checkbox"
                  checked={(selected2D ?? selected3D)!.autoIntersect}
                  onChange={(e) => {
                    if (selected2D) onUpdate2D(selected2D.id, { autoIntersect: e.target.checked });
                    if (selected3D) onUpdate3D(selected3D.id, { autoIntersect: e.target.checked });
                  }}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
              </label>
            </div>

            {/* 2D Measurements & Radius */}
            {selected2D && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                {selected2D.kind === 'circle2d' && selected2D.radius !== undefined && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      <span>Bán kính (R)</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                        {selected2D.radius.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="6"
                      step="0.05"
                      value={selected2D.radius}
                      onChange={(e) =>
                        onUpdate2D(selected2D.id, { radius: parseFloat(e.target.value) })
                      }
                      className="w-full geosim-slider bg-slate-200 dark:bg-slate-700"
                    />
                    <div className="mt-2 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Chu vi · Diện tích</span>
                      <span className="font-mono text-slate-700 dark:text-slate-200">
                        {(2 * Math.PI * selected2D.radius).toFixed(2)} ·{' '}
                        {(Math.PI * selected2D.radius ** 2).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {selected2D.kind === 'segment2d' && selected2D.points.length >= 2 && (
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Độ dài đoạn thẳng</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                      {dist2D(selected2D.points[0], selected2D.points[1]).toFixed(2)}
                    </span>
                  </div>
                )}

                {selected2D.kind === 'angle2d' && selected2D.points.length >= 3 && (
                  <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Số đo góc</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                      {computeAngleDegrees2D(
                        selected2D.points[0],
                        selected2D.points[1],
                        selected2D.points[2],
                      ).toFixed(1)}
                      °
                    </span>
                  </div>
                )}

                {isPolygonKind(selected2D.kind) && (
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Chu vi</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                        {polygonPerimeter2D(selected2D.points).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400">
                      <span>Diện tích</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                        {polygonArea2D(selected2D.points).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3D Position, Rotation & Dimensions */}
            {selected3D && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                {/* Position */}
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    Tọa độ tâm (X, Y, Z)
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['x', 'y', 'z'] as const).map((axis) => (
                      <div key={axis} className="flex flex-col">
                        <span className="text-[10px] uppercase text-slate-400 mb-0.5">{axis}</span>
                        <input
                          type="number"
                          step="0.2"
                          value={Number(selected3D.position[axis].toFixed(2))}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (Number.isNaN(val)) return;
                            onUpdate3D(selected3D.id, {
                              position: { ...selected3D.position, [axis]: val },
                            });
                          }}
                          className="w-full px-1.5 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-800 dark:text-slate-100"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rotation in degrees */}
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    Góc nghiêng / Xoay (°)
                  </span>
                  <div className="space-y-1.5">
                    {(['x', 'y', 'z'] as const).map((axis) => (
                      <div key={axis} className="flex items-center gap-2">
                        <span className="w-3 font-mono text-[11px] uppercase text-slate-500">
                          {axis}
                        </span>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="1"
                          value={radToDeg(selected3D.rotation[axis])}
                          onChange={(e) => {
                            const deg = parseFloat(e.target.value);
                            onUpdate3D(selected3D.id, {
                              rotation: { ...selected3D.rotation, [axis]: degToRad(deg) },
                            });
                          }}
                          className="flex-1 geosim-slider bg-slate-200 dark:bg-slate-700"
                        />
                        <span className="w-9 text-right font-mono text-[11px] text-slate-700 dark:text-slate-200">
                          {radToDeg(selected3D.rotation[axis])}°
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dimensions */}
                {selected3D.kind === 'plane3d' && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      <span>Kích thước lưới mặt phẳng</span>
                      <span className="font-mono">{selected3D.dimensions.planeSize.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="4"
                      max="14"
                      step="0.5"
                      value={selected3D.dimensions.planeSize}
                      onChange={(e) =>
                        onUpdate3D(selected3D.id, {
                          dimensions: {
                            ...selected3D.dimensions,
                            planeSize: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full geosim-slider bg-slate-200 dark:bg-slate-700"
                    />
                  </div>
                )}

                {is3DSolidKind(selected3D.kind) && (
                  <div className="space-y-2">
                    {selected3D.kind !== 'cylinder' &&
                      selected3D.kind !== 'cone' &&
                      selected3D.kind !== 'sphere' && (
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                            <span>Cạnh đáy (a)</span>
                            <span className="font-mono">
                              {selected3D.dimensions.width.toFixed(1)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="7"
                            step="0.2"
                            value={selected3D.dimensions.width}
                            onChange={(e) =>
                              onUpdate3D(selected3D.id, {
                                dimensions: {
                                  ...selected3D.dimensions,
                                  width: parseFloat(e.target.value),
                                },
                              })
                            }
                            className="w-full geosim-slider bg-slate-200 dark:bg-slate-700"
                          />
                        </div>
                      )}

                    {(selected3D.kind === 'cylinder' ||
                      selected3D.kind === 'cone' ||
                      selected3D.kind === 'sphere') && (
                      <div>
                        <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                          <span>Bán kính (R)</span>
                          <span className="font-mono">
                            {selected3D.dimensions.radius.toFixed(1)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.6"
                          max="4.5"
                          step="0.1"
                          value={selected3D.dimensions.radius}
                          onChange={(e) =>
                            onUpdate3D(selected3D.id, {
                              dimensions: {
                                ...selected3D.dimensions,
                                radius: parseFloat(e.target.value),
                              },
                            })
                          }
                          className="w-full geosim-slider bg-slate-200 dark:bg-slate-700"
                        />
                      </div>
                    )}

                    {selected3D.kind !== 'cube' &&
                      selected3D.kind !== 'tetrahedron' &&
                      selected3D.kind !== 'sphere' && (
                        <div>
                          <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                            <span>Chiều cao (h)</span>
                            <span className="font-mono">
                              {selected3D.dimensions.height.toFixed(1)}
                            </span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="8"
                            step="0.2"
                            value={selected3D.dimensions.height}
                            onChange={(e) =>
                              onUpdate3D(selected3D.id, {
                                dimensions: {
                                  ...selected3D.dimensions,
                                  height: parseFloat(e.target.value),
                                },
                              })
                            }
                            className="w-full geosim-slider bg-slate-200 dark:bg-slate-700"
                          />
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Real-Time Intersection & Cross-Section Readout */}
      <div
        className={`p-3.5 bg-slate-50/80 dark:bg-slate-950/60 flex-1 md:flex-none md:max-h-[32%] overflow-y-auto space-y-2 ${
          mobileTab === 'intersections' ? 'block' : 'hidden md:block'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xs font-semibold text-slate-800 dark:text-slate-100">
            Giao tuyến &amp; Thiết diện
          </h2>
          <span className="text-[11px] font-mono text-red-600 dark:text-red-400">
            {intersectionCount} kết quả
          </span>
        </div>

        {mode === '3d' ? (
          intersections3D.crossSections.length === 0 &&
          intersections3D.planeLines.length === 0 &&
          intersections3D.lineHits.length === 0 &&
          intersections3D.solidSeams.length === 0 ? (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Di chuyển hoặc xoay mặt phẳng, đường thẳng cắt qua khối để quan sát thiết diện thời gian thực.
            </p>
          ) : (
            <div className="space-y-1.5">
              {intersections3D.crossSections.map((cs) => (
                <div
                  key={cs.id}
                  className="p-2 rounded-md bg-white dark:bg-slate-900 border border-red-200/80 dark:border-red-900/50 text-[11px]"
                >
                  <div className="font-semibold text-red-600 dark:text-red-400">
                    Thiết diện: {cs.shapeLabel}
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                    {cs.planeName} ∩ {cs.solidName}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    Diện tích ≈ {cs.area.toFixed(2)} đvdt
                    {cs.vertexCount <= 8 ? ` · ${cs.vertexCount} đỉnh` : ''}
                  </div>
                </div>
              ))}

              {intersections3D.planeLines.map((pl) => (
                <div
                  key={pl.id}
                  className="p-2 rounded-md bg-white dark:bg-slate-900 border border-red-200/80 dark:border-red-900/50 text-[11px]"
                >
                  <div className="font-semibold text-red-600 dark:text-red-400">
                    Giao tuyến hai mặt phẳng
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                    {pl.plane1Name} ∩ {pl.plane2Name}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    u = ({pl.direction.x.toFixed(2)}, {pl.direction.y.toFixed(2)},{' '}
                    {pl.direction.z.toFixed(2)})
                  </div>
                </div>
              ))}

              {intersections3D.lineHits.map((lh) => (
                <div
                  key={lh.id}
                  className="p-2 rounded-md bg-white dark:bg-slate-900 border border-red-200/80 dark:border-red-900/50 text-[11px]"
                >
                  <div className="font-semibold text-red-600 dark:text-red-400">
                    Giao điểm ({lh.points.length})
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                    {lh.lineName} ∩ {lh.targetName}
                  </div>
                  {lh.points.map((pt, idx) => (
                    <div key={idx} className="text-slate-500 dark:text-slate-400 font-mono">
                      I{idx + 1}({pt.x.toFixed(2)}, {pt.y.toFixed(2)}, {pt.z.toFixed(2)})
                    </div>
                  ))}
                </div>
              ))}

              {intersections3D.solidSeams.map((ss) => (
                <div
                  key={ss.id}
                  className="p-2 rounded-md bg-white dark:bg-slate-900 border border-red-200/80 dark:border-red-900/50 text-[11px]"
                >
                  <div className="font-semibold text-red-600 dark:text-red-400">
                    Giao tuyến 2 khối 3D
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                    {ss.solid1Name} ∩ {ss.solid2Name}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : intersections2D.points.length === 0 && intersections2D.regions.length === 0 ? (
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Kéo hai hình 2D chạm hoặc chồng lên nhau để xem giao điểm và diện tích giao nhau.
          </p>
        ) : (
          <div className="space-y-1.5">
            {intersections2D.regions.map((reg) => (
              <div
                key={reg.id}
                className="p-2 rounded-md bg-white dark:bg-slate-900 border border-red-200/80 dark:border-red-900/50 text-[11px]"
              >
                <div className="font-semibold text-red-600 dark:text-red-400">
                  Miền giao nhau
                </div>
                <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                  {reg.sources[0]} ∩ {reg.sources[1]}
                </div>
                <div className="text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Diện tích ≈ {reg.area.toFixed(2)} đvdt
                </div>
              </div>
            ))}

            {intersections2D.points.map((pt, idx) => (
              <div
                key={pt.id}
                className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] flex items-center justify-between"
              >
                <span className="text-slate-600 dark:text-slate-300 truncate pr-2">
                  Giao điểm {idx + 1}
                </span>
                <span className="font-mono font-medium text-red-600 dark:text-red-400 shrink-0">
                  ({pt.point.x.toFixed(2)}, {pt.point.y.toFixed(2)})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
