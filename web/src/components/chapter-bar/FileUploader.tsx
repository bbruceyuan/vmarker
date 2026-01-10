"use client";

/**
 * [INPUT]: 依赖 @/lib/api, @/components/ui/*
 * [OUTPUT]: 对外提供 FileUploader 组件
 * [POS]: Chapter Bar 文件上传组件，支持拖拽和点击上传
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, AlertCircle, Zap, Settings } from "lucide-react";
import { chapterBarApi, formatTime } from "@/lib/api";

interface FileUploaderProps {
  onUploaded: (file: File, duration: number) => void;
  onQuickGenerate?: (file: File, duration: number) => void;
}

export default function FileUploader({ onUploaded, onQuickGenerate }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<{
    subtitle_count: number;
    duration: number;
  } | null>(null);

  // Handle file selection
  const handleFile = useCallback(async (file: File) => {
    // Validate file type
    if (!file.name.toLowerCase().endsWith(".srt")) {
      setError("请上传 .srt 格式的字幕文件");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("文件大小不能超过 10MB");
      return;
    }

    setError(null);
    setSelectedFile(file);
    setIsLoading(true);

    try {
      const result = await chapterBarApi.parse(file);
      setParseResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析文件失败");
      setSelectedFile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // File input handler
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // Confirm and proceed to detailed config
  const handleDetailedConfig = useCallback(() => {
    if (selectedFile && parseResult) {
      onUploaded(selectedFile, parseResult.duration);
    }
  }, [selectedFile, parseResult, onUploaded]);

  // Quick generate
  const handleQuickGenerate = useCallback(() => {
    if (selectedFile && parseResult && onQuickGenerate) {
      onQuickGenerate(selectedFile, parseResult.duration);
    }
  }, [selectedFile, parseResult, onQuickGenerate]);

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : selectedFile
            ? "border-primary/50 bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
      >
        <input
          type="file"
          accept=".srt"
          onChange={handleInputChange}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">正在解析文件...</p>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-3">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">{selectedFile.name}</p>
              {parseResult && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {parseResult.subtitle_count} 条字幕 · 时长{" "}
                  {formatTime(parseResult.duration)}
                </p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">点击或拖拽更换文件</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-lg bg-muted p-3">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">拖拽文件到这里</p>
              <p className="mt-1 text-sm text-muted-foreground">
                或点击选择 SRT 字幕文件
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Action Buttons */}
      {selectedFile && parseResult && (
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-end">
          {onQuickGenerate && (
            <Button variant="default" onClick={handleQuickGenerate} className="gap-2">
              <Zap className="h-4 w-4" />
              快速生成
            </Button>
          )}
          <Button variant="outline" onClick={handleDetailedConfig} className="gap-2">
            <Settings className="h-4 w-4" />
            详细配置
          </Button>
        </div>
      )}

      {/* Quick Mode Hint */}
      {selectedFile && parseResult && onQuickGenerate && (
        <p className="text-center text-xs text-muted-foreground">
          快速生成：自动分段 + 默认配色，一键直达预览
        </p>
      )}
    </div>
  );
}
