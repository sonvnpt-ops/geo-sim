import React, { useState, useRef, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  Grid3X3,
  Axis3D,
  Magnet,
  Sun,
  Moon,
  Trash2,
  Download,
  BookOpen,
  ChevronDown,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { PRESETS_2D, PRESETS_3D } from '../data/presets';
import { WorkspaceMode } from '../types/geometry';

interface TopBarProps {
  mode: WorkspaceMode;
  onChangeMode: (mode: WorkspaceMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showAxes: boolean;
  onToggleAxes: () => void;
  snapToGrid: boolean;
  onToggleSnap: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onClearAll: () => void;
  onExportPng: () => void;
  onSelectPreset2D: (presetId: string) => void;
  onSelectPreset3D: (presetId: string) => void;
}

export function TopBar({
  mode,
  onChangeMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  showGrid,
  onToggleGrid,
  showAxes,
  onToggleAxes,
  snapToGrid,
  onToggleSnap,
  isDark,
  onToggleDark,
  sidebarOpen,
  onToggleSidebar,
  onClearAll,
  onExportPng,
  onSelectPreset2D,
  onSelectPreset3D,
}: TopBarProps) {
  const [presetOpen, setPresetOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPresetOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const presets = mode === '3d' ? PRESETS_3D : PRESETS_2D;

  return (
    <header className="h-13 px-2.5 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 z-30 overflow-x-auto">
      {/* Left: Wordmark + 2D/3D Switcher */}
      <div className="flex items-center gap-2.5 sm:gap-5 shrink-0">
        <span className="font-display text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0">
          GeoSim
        </span>

        <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70">
          <button
            onClick={() => onChangeMode('2d')}
            className={`px-2.5 sm:px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
              mode === '2d'
                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            2D <span className="hidden sm:inline">Phẳng</span>
          </button>
          <button
            onClick={() => onChangeMode('3d')}
            className={`px-2.5 sm:px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
              mode === '3d'
                ? 'bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            3D <span className="hidden sm:inline">Không gian</span>
          </button>
        </div>

        {/* Textbook Presets Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setPresetOpen((o) => !o)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span className="hidden sm:inline">Bài toán mẫu</span>
            <span className="sm:hidden">Mẫu</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {presetOpen && (
            <div className="fixed sm:absolute left-2 sm:left-0 mt-1.5 w-76 sm:w-80 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg py-1.5 z-50">
              <div className="px-3 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                Chọn kịch bản {mode === '3d' ? 'Hình học không gian 3D' : 'Hình học phẳng 2D'}
              </div>
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    if (mode === '3d') onSelectPreset3D(p.id);
                    else onSelectPreset2D(p.id);
                    setPresetOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                    {p.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {p.subtitle}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Hoàn tác (Ctrl+Z)"
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Làm lại (Ctrl+Y)"
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-35 disabled:pointer-events-none"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5 sm:mx-1" />

        <button
          onClick={onToggleGrid}
          title="Bật/tắt lưới tọa độ"
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
            showGrid
              ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
          }`}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Lưới</span>
        </button>

        <button
          onClick={onToggleAxes}
          title="Bật/tắt hệ trục tọa độ"
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
            showAxes
              ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
          }`}
        >
          <Axis3D className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">{mode === '3d' ? 'Oxyz' : 'Oxy'}</span>
        </button>

        {mode === '2d' && (
          <button
            onClick={onToggleSnap}
            title="Bắt điểm theo lưới (0.25)"
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              snapToGrid
                ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Bắt lưới</span>
          </button>
        )}

        <button
          onClick={onToggleDark}
          title={isDark ? 'Chuyển nền sáng' : 'Chuyển nền tối'}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-0.5 sm:mx-1" />

        <button
          onClick={onClearAll}
          title="Xóa tất cả đối tượng"
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 whitespace-nowrap shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Xóa hết</span>
        </button>

        <button
          onClick={onExportPng}
          title="Xuất ảnh PNG"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-600 hover:bg-sky-700 text-white whitespace-nowrap shrink-0 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Xuất PNG</span>
        </button>

        <button
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Ẩn khung thuộc tính' : 'Hiện khung thuộc tính'}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
            sidebarOpen
              ? 'bg-slate-100 dark:bg-slate-800 text-sky-700 dark:text-sky-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          {sidebarOpen ? (
            <PanelRightClose className="w-4 h-4" />
          ) : (
            <PanelRightOpen className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{sidebarOpen ? 'Ẩn bảng' : 'Thuộc tính'}</span>
        </button>
      </div>
    </header>
  );
}
