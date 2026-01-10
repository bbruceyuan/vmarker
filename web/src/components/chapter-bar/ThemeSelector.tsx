"use client";

/**
 * [INPUT]: 依赖 @/lib/api, @/components/ui/*
 * [OUTPUT]: 对外提供 ThemeSelector 组件
 * [POS]: Chapter Bar 配色选择器和视频配置组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Loader2, Palette } from "lucide-react";
import { chapterBarApi, type Theme, type CustomColors } from "@/lib/api";

interface ThemeSelectorProps {
  theme: string;
  customColors: CustomColors | null;
  width: number;
  height: number;
  onChange: (config: { theme: string; customColors: CustomColors | null; width: number; height: number }) => void;
  onNext: () => void;
  onPrev: () => void;
}

// 预设尺寸
const PRESET_SIZES = [
  { label: "1080p", width: 1920, height: 60 },
  { label: "720p", width: 1280, height: 50 },
  { label: "4K", width: 3840, height: 80 },
];

export default function ThemeSelector({
  theme: selectedTheme,
  customColors,
  width,
  height,
  onChange,
  onNext,
  onPrev,
}: ThemeSelectorProps) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [localWidth, setLocalWidth] = useState(width);
  const [localHeight, setLocalHeight] = useState(height);
  const [isCustomMode, setIsCustomMode] = useState(!!customColors);
  const [localCustomColors, setLocalCustomColors] = useState<CustomColors>(
    customColors || { played_bg: "#2563EB", unplayed_bg: "#64748B" }
  );

  // Fetch themes on mount
  useEffect(() => {
    chapterBarApi
      .getThemes()
      .then(setThemes)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // Update parent on theme change
  const handleThemeChange = useCallback(
    (themeId: string) => {
      setIsCustomMode(false);
      onChange({ theme: themeId, customColors: null, width: localWidth, height: localHeight });
    },
    [localWidth, localHeight, onChange]
  );

  // Switch to custom mode
  const handleCustomModeToggle = useCallback(() => {
    setIsCustomMode(true);
    onChange({ theme: selectedTheme, customColors: localCustomColors, width: localWidth, height: localHeight });
  }, [selectedTheme, localCustomColors, localWidth, localHeight, onChange]);

  // Update custom colors
  const handleCustomColorChange = useCallback(
    (key: "played_bg" | "unplayed_bg", value: string) => {
      const newColors = { ...localCustomColors, [key]: value };
      setLocalCustomColors(newColors);
      if (isCustomMode) {
        onChange({ theme: selectedTheme, customColors: newColors, width: localWidth, height: localHeight });
      }
    },
    [isCustomMode, selectedTheme, localCustomColors, localWidth, localHeight, onChange]
  );

  const handleSizeChange = useCallback(
    (w: number, h: number) => {
      setLocalWidth(w);
      setLocalHeight(h);
      onChange({
        theme: selectedTheme,
        customColors: isCustomMode ? localCustomColors : null,
        width: w,
        height: h,
      });
    },
    [selectedTheme, isCustomMode, localCustomColors, onChange]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get current display colors for preview
  const displayColors = isCustomMode
    ? localCustomColors
    : themes.find((t) => t.name === selectedTheme) || { played_bg: "#2563EB", unplayed_bg: "#64748B" };

  return (
    <div className="space-y-8">
      {/* Theme Selection */}
      <div>
        <Label className="text-base font-medium">配色方案</Label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {themes.map((theme) => (
            <ThemeCard
              key={theme.name}
              theme={theme}
              selected={!isCustomMode && selectedTheme === theme.name}
              onClick={() => handleThemeChange(theme.name)}
            />
          ))}
          {/* Custom Color Card */}
          <button
            className={`rounded-lg border p-3 text-left transition-all ${
              isCustomMode
                ? "border-primary ring-2 ring-primary bg-primary/5"
                : "hover:border-primary/50"
            }`}
            onClick={handleCustomModeToggle}
          >
            <div className="flex h-8 items-center justify-center rounded bg-muted/50">
              <Palette className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-sm font-medium">自定义配色</p>
          </button>
        </div>
      </div>

      {/* Custom Color Pickers */}
      {isCustomMode && (
        <div className="rounded-lg border bg-muted/20 p-4">
          <Label className="text-base font-medium">自定义颜色</Label>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="played_bg" className="text-sm">
                已播放颜色
              </Label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="played_bg"
                  type="color"
                  value={localCustomColors.played_bg}
                  onChange={(e) => handleCustomColorChange("played_bg", e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border"
                />
                <Input
                  value={localCustomColors.played_bg}
                  onChange={(e) => handleCustomColorChange("played_bg", e.target.value)}
                  className="w-28 font-mono text-sm"
                  placeholder="#2563EB"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="unplayed_bg" className="text-sm">
                未播放颜色
              </Label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="unplayed_bg"
                  type="color"
                  value={localCustomColors.unplayed_bg}
                  onChange={(e) => handleCustomColorChange("unplayed_bg", e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border"
                />
                <Input
                  value={localCustomColors.unplayed_bg}
                  onChange={(e) => handleCustomColorChange("unplayed_bg", e.target.value)}
                  className="w-28 font-mono text-sm"
                  placeholder="#64748B"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Video Size */}
      <div>
        <Label className="text-base font-medium">视频尺寸</Label>

        {/* Presets */}
        <div className="mt-4 flex flex-wrap gap-2">
          {PRESET_SIZES.map((preset) => (
            <Button
              key={preset.label}
              variant={
                localWidth === preset.width && localHeight === preset.height
                  ? "default"
                  : "outline"
              }
              size="sm"
              onClick={() => handleSizeChange(preset.width, preset.height)}
            >
              {preset.label} ({preset.width}×{preset.height})
            </Button>
          ))}
        </div>

        {/* Custom Size */}
        <div className="mt-4 flex items-center gap-4">
          <div>
            <Label htmlFor="width" className="text-sm">
              宽度
            </Label>
            <Input
              id="width"
              type="number"
              min={100}
              max={4096}
              value={localWidth}
              onChange={(e) => handleSizeChange(Number(e.target.value), localHeight)}
              className="mt-1 w-24"
            />
          </div>
          <span className="mt-6 text-muted-foreground">×</span>
          <div>
            <Label htmlFor="height" className="text-sm">
              高度
            </Label>
            <Input
              id="height"
              type="number"
              min={20}
              max={200}
              value={localHeight}
              onChange={(e) => handleSizeChange(localWidth, Number(e.target.value))}
              className="mt-1 w-24"
            />
          </div>
          <span className="mt-6 text-sm text-muted-foreground">像素</span>
        </div>
      </div>

      {/* Preview */}
      <div>
        <Label className="text-base font-medium">预览</Label>
        <div className="mt-4 overflow-hidden rounded-lg border bg-muted/20 p-4">
          <ThemePreview
            colors={displayColors}
            width={localWidth}
            height={localHeight}
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          上一步
        </Button>
        <Button onClick={onNext}>
          下一步
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// ThemeCard 组件
// ============================================================
function ThemeCard({
  theme,
  selected,
  onClick,
}: {
  theme: Theme;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-lg border p-3 text-left transition-all ${
        selected
          ? "border-primary ring-2 ring-primary bg-primary/5"
          : "hover:border-primary/50"
      }`}
      onClick={onClick}
    >
      {/* Color Preview */}
      <div className="flex h-8 overflow-hidden rounded">
        <div
          className="flex-1"
          style={{ backgroundColor: theme.played_bg }}
        />
        <div
          className="flex-1"
          style={{ backgroundColor: theme.unplayed_bg }}
        />
      </div>
      <p className="mt-2 text-sm font-medium">{theme.display_name}</p>
    </button>
  );
}

// ============================================================
// ThemePreview 组件
// ============================================================
function ThemePreview({
  colors,
  width,
  height,
}: {
  colors: { played_bg: string; unplayed_bg: string };
  width: number;
  height: number;
}) {
  // Scale for display
  const scale = Math.min(1, 600 / width);
  const displayWidth = width * scale;
  const displayHeight = height * scale;

  // Mock chapters for preview
  const chapters = [
    { title: "开场介绍", width: 15 },
    { title: "核心内容", width: 45 },
    { title: "总结", width: 40 },
  ];

  // 根据背景色计算文字颜色（简单的亮度判断）
  const getTextColor = (bgColor: string): string => {
    const hex = bgColor.replace("#", "");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? "#000000" : "#ffffff";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex overflow-hidden rounded"
        style={{
          width: displayWidth,
          height: displayHeight,
        }}
      >
        {chapters.map((chapter, index) => {
          const isPlayed = index === 0 || (index === 1 && chapter.width > 30);
          const bgColor = isPlayed ? colors.played_bg : colors.unplayed_bg;
          return (
            <div
              key={index}
              className="flex items-center justify-center border-r border-white/30 last:border-r-0"
              style={{
                width: `${chapter.width}%`,
                backgroundColor: bgColor,
              }}
            >
              <span
                className="truncate px-1 text-xs"
                style={{
                  color: getTextColor(bgColor),
                  fontSize: Math.max(8, displayHeight * 0.3),
                }}
              >
                {chapter.title}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {width} × {height} 像素
      </p>
    </div>
  );
}
