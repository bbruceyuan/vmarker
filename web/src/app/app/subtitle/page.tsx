"use client";

/**
 * [INPUT]: 依赖 @/lib/api、@/components/ui/*
 * [OUTPUT]: 对外提供 SubtitlePage 页面组件
 * [POS]: 字幕润色功能页面，上传字幕进行 AI 修正
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, FileText, Loader2, Download, Check, X } from "lucide-react";
import Link from "next/link";
import { subtitleApi, type PolishResult, type PolishedSubtitleItem } from "@/lib/api";

// ============================================================
// 页面组件
// ============================================================
export default function SubtitlePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PolishResult | null>(null);
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith(".srt")) {
        setError("请上传 .srt 格式的字幕文件");
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  }, []);

  // Polish subtitles
  const handlePolish = useCallback(async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await subtitleApi.polish(file);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "润色失败");
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  // Download polished SRT
  const handleDownload = useCallback(() => {
    if (!result || !file) return;

    const blob = new Blob([result.srt_content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const originalName = file.name.replace(/\.srt$/i, "");
    a.download = `${originalName}_polished.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [result, file]);

  // Filter subtitles
  const displayedSubtitles = result?.subtitles.filter(
    (s) => !showOnlyChanged || s.changed
  ) || [];

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/app"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回功能列表
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">字幕润色</h1>
          <p className="mt-1 text-muted-foreground">
            AI 修正空耳错误、同音字，提升字幕质量
          </p>
        </div>

        {/* Upload Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>上传字幕文件</CardTitle>
            <CardDescription>支持 SRT 格式字幕文件，时间戳保持不变</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex-1">
                <div
                  className={`flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                    file ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                >
                  <input
                    type="file"
                    accept=".srt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-2">
                    {file ? (
                      <>
                        <FileText className="h-8 w-8 text-primary" />
                        <span className="text-sm font-medium">{file.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">点击选择文件</span>
                      </>
                    )}
                  </div>
                </div>
              </label>
            </div>

            <Button
              onClick={handlePolish}
              disabled={!file || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在润色...
                </>
              ) : (
                "开始润色"
              )}
            </Button>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Result Card */}
        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>润色结果</CardTitle>
                  <CardDescription>
                    共 {result.subtitles.length} 条字幕，修改了 {result.changes_count} 条
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowOnlyChanged(!showOnlyChanged)}
                  >
                    {showOnlyChanged ? "显示全部" : "只看修改"}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    下载 SRT
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[400px] space-y-3 overflow-y-auto">
                {displayedSubtitles.map((item) => (
                  <SubtitleItem key={item.index} item={item} />
                ))}
                {displayedSubtitles.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    没有需要修改的字幕
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SubtitleItem 组件
// ============================================================
function SubtitleItem({ item }: { item: PolishedSubtitleItem }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        item.changed ? "border-primary/50 bg-primary/5" : "border-muted"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">#{item.index}</span>
        {item.changed ? (
          <Badge variant="default" className="text-xs">
            <Check className="mr-1 h-3 w-3" />
            已修正
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            无变化
          </Badge>
        )}
      </div>

      {item.changed ? (
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground line-through">{item.original_text}</p>
          <p className="font-medium">{item.polished_text}</p>
        </div>
      ) : (
        <p className="text-sm">{item.original_text}</p>
      )}
    </div>
  );
}
