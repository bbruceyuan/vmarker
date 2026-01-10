"use client";

/**
 * [INPUT]: 依赖 @/lib/api, @/components/ui/*
 * [OUTPUT]: 对外提供 ExtractionMode 组件
 * [POS]: Chapter Bar 章节提取模式选择组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Clock, Loader2, AlertCircle } from "lucide-react";
import { chapterBarApi, type Chapter } from "@/lib/api";

interface ExtractionModeProps {
  file: File;
  duration: number;
  onExtracted: (chapters: Chapter[]) => void;
}

type Mode = "ai" | "auto";

export default function ExtractionMode({
  file,
  duration,
  onExtracted,
}: ExtractionModeProps) {
  const [mode, setMode] = useState<Mode>("ai");
  const [interval, setInterval] = useState(60);
  const [intervalInput, setIntervalInput] = useState("60"); // 输入状态
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 处理输入变化
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIntervalInput(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 30 && num <= 300) {
      setInterval(num);
    }
  };

  // 失去焦点时规范化显示
  const handleIntervalBlur = () => {
    setIntervalInput(String(interval));
  };

  const handleExtract = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let result;
      if (mode === "ai") {
        // AI 模式 - 服务端会使用内置的 API Key
        result = await chapterBarApi.extractAI(file);
      } else {
        // 自动模式
        result = await chapterBarApi.extractAuto(file, interval);
      }
      onExtracted(result.chapters);
    } catch (err) {
      const message = err instanceof Error ? err.message : "提取章节失败";
      setError(message);

      // AI 失败时自动降级到自动模式
      if (mode === "ai") {
        setError(`${message}，正在尝试自动分段...`);
        try {
          const fallbackResult = await chapterBarApi.extractAuto(file, interval);
          onExtracted(fallbackResult.chapters);
          setError(null);
        } catch {
          setError("提取章节失败，请重试");
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [file, mode, interval, onExtracted]);

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ModeCard
          icon={Sparkles}
          title="AI 智能分段"
          description="使用 AI 分析内容，自动识别主题变化点"
          selected={mode === "ai"}
          onClick={() => setMode("ai")}
          recommended
        />
        <ModeCard
          icon={Clock}
          title="固定时间分段"
          description="按固定时间间隔均匀划分章节"
          selected={mode === "auto"}
          onClick={() => setMode("auto")}
        />
      </div>

      {/* Auto Mode Config */}
      {mode === "auto" && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <Label htmlFor="interval" className="text-sm font-medium">
            分段间隔（秒）
          </Label>
          <div className="mt-2 flex items-center gap-4">
            <Input
              id="interval"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={intervalInput}
              onChange={handleIntervalChange}
              onBlur={handleIntervalBlur}
              className="w-24"
            />
            <span className="text-sm text-muted-foreground">
              将生成约 {Math.ceil(duration / interval)} 个章节
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">有效范围：30-300 秒</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Extract Button */}
      <div className="flex justify-end">
        <Button onClick={handleExtract} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "正在提取..." : "提取章节"}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// ModeCard 组件
// ============================================================
function ModeCard({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
  recommended,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  recommended?: boolean;
}) {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        selected
          ? "border-primary ring-1 ring-primary"
          : "hover:border-primary/50"
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div
            className={`rounded-lg p-2 ${
              selected ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          {recommended && (
            <span className="text-xs text-primary">推荐</span>
          )}
        </div>
        <h3 className="mt-3 font-medium">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
