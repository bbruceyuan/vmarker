"use client";

/**
 * [INPUT]: 依赖 shownotes 组件、@/lib/api、@/components/ui/*
 * [OUTPUT]: 对外提供 ShowNotesPage 页面组件
 * [POS]: Show Notes 功能页面，上传字幕生成视频大纲
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, FileText, Loader2, Copy, RefreshCw, Check, Clock } from "lucide-react";
import Link from "next/link";
import { showNotesApi, formatTime, type ShowNotesResult, type OutlineItem } from "@/lib/api";

// ============================================================
// 页面组件
// ============================================================
export default function ShowNotesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ShowNotesResult | null>(null);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [copied, setCopied] = useState(false);

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

  // Generate show notes
  const handleGenerate = useCallback(async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await showNotesApi.generate(file);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setIsLoading(false);
    }
  }, [file]);

  // Regenerate
  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  // Format output text
  const formatOutput = useCallback((data: ShowNotesResult, withTimestamps: boolean): string => {
    let text = `## 视频摘要\n\n${data.summary}\n\n## 内容大纲\n\n`;

    if (withTimestamps) {
      text += data.outline
        .map((item) => `- ${formatTime(item.timestamp)} ${item.title}`)
        .join("\n");
    } else {
      text += data.outline.map((item) => `- ${item.title}`).join("\n");
    }

    return text;
  }, []);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!result) return;

    const text = formatOutput(result, showTimestamps);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result, showTimestamps, formatOutput]);

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
          <h1 className="text-2xl font-bold tracking-tight">视频大纲</h1>
          <p className="mt-1 text-muted-foreground">
            AI 自动从字幕生成结构化视频大纲
          </p>
        </div>

        {/* Upload Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>上传字幕文件</CardTitle>
            <CardDescription>支持 SRT 格式字幕文件</CardDescription>
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
              onClick={handleGenerate}
              disabled={!file || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  正在生成...
                </>
              ) : (
                "生成大纲"
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
                <CardTitle>生成结果</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTimestamps(!showTimestamps)}
                  >
                    <Clock className="mr-1 h-4 w-4" />
                    {showTimestamps ? "隐藏时间戳" : "显示时间戳"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isLoading}
                  >
                    <RefreshCw className="mr-1 h-4 w-4" />
                    重新生成
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <>
                        <Check className="mr-1 h-4 w-4" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-4 w-4" />
                        复制
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">视频摘要</h3>
                <p className="text-sm leading-relaxed">{result.summary}</p>
              </div>

              {/* Outline */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-muted-foreground">内容大纲</h3>
                <ul className="space-y-2">
                  {result.outline.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      {showTimestamps && (
                        <span className="shrink-0 rounded bg-muted px-2 py-0.5 font-mono text-xs">
                          {formatTime(item.timestamp)}
                        </span>
                      )}
                      <span>{item.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
