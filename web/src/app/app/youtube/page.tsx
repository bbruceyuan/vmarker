"use client";

/**
 * [INPUT]: 依赖 @/lib/api、@/components/ui/*
 * [OUTPUT]: 对外提供 YouTubePage 页面组件
 * [POS]: YouTube 章节生成功能页面，粘贴链接获取字幕生成 YouTube 章节
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Loader2,
  Copy,
  RefreshCw,
  Check,
  Youtube,
  Captions,
  Sparkles,
  CheckCircle2,
  Circle,
} from "lucide-react";
import Link from "next/link";
import { youtubeApi, type YouTubeChaptersResult } from "@/lib/api";

// ============================================================
// 进度状态
// ============================================================

type ProcessingStep = "idle" | "fetching" | "analyzing" | "done" | "error";

const STEPS = [
  { key: "fetching", label: "获取字幕", icon: Captions },
  { key: "analyzing", label: "AI 智能分段", icon: Sparkles },
] as const;

// ============================================================
// 页面组件
// ============================================================

export default function YouTubePage() {
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<ProcessingStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<YouTubeChaptersResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Validate URL
  const isValidUrl = useCallback((input: string): boolean => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/;
    return pattern.test(input.trim());
  }, []);

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (!url.trim() || !isValidUrl(url)) {
      setError("请输入有效的 YouTube 链接");
      return;
    }

    setError(null);
    setResult(null);
    setStep("fetching");

    // 模拟进度步骤（实际是一个长请求）
    const progressTimer = setTimeout(() => setStep("analyzing"), 2000);

    try {
      const data = await youtubeApi.generateFromUrl(url);
      clearTimeout(progressTimer);
      setResult(data);
      setStep("done");
    } catch (err) {
      clearTimeout(progressTimer);
      setError(err instanceof Error ? err.message : "生成失败，请检查链接是否正确");
      setStep("error");
    }
  }, [url, isValidUrl]);

  // Regenerate
  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (!result) return;

    await navigator.clipboard.writeText(result.youtube_format);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  // Get step status
  const getStepStatus = useCallback(
    (stepKey: string) => {
      const stepOrder = ["fetching", "analyzing"];
      const currentIndex = stepOrder.indexOf(step);
      const targetIndex = stepOrder.indexOf(stepKey);

      if (step === "done") return "done";
      if (step === "error" || step === "idle") return "pending";
      if (targetIndex < currentIndex) return "done";
      if (targetIndex === currentIndex) return "active";
      return "pending";
    },
    [step]
  );

  const isProcessing = ["fetching", "analyzing"].includes(step);

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
          <h1 className="text-2xl font-bold tracking-tight">YouTube 章节生成器</h1>
          <p className="mt-1 text-muted-foreground">
            粘贴 YouTube 链接，一键生成视频章节
          </p>
        </div>

        {/* Input Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" />
              YouTube 视频链接
            </CardTitle>
            <CardDescription>
              支持 youtube.com/watch?v=xxx 或 youtu.be/xxx 格式
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isProcessing}
              className="font-mono text-sm"
            />

            <Button
              onClick={handleGenerate}
              disabled={!url.trim() || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                "生成章节"
              )}
            </Button>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>

        {/* Progress Card */}
        {isProcessing && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>处理进度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {STEPS.map(({ key, label, icon: Icon }) => {
                  const status = getStepStatus(key);
                  return (
                    <div key={key} className="flex items-center gap-3">
                      {status === "done" ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : status === "active" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground/50" />
                      )}
                      <Icon
                        className={`h-4 w-4 ${
                          status === "pending"
                            ? "text-muted-foreground/50"
                            : "text-foreground"
                        }`}
                      />
                      <span
                        className={
                          status === "pending"
                            ? "text-muted-foreground/50"
                            : "text-foreground"
                        }
                      >
                        {label}
                        {status === "active" && "..."}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result Card */}
        {result && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>生成结果</CardTitle>
                  <CardDescription className="mt-1">
                    {result.video_title}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isProcessing}
                  >
                    <RefreshCw className="mr-1 h-4 w-4" />
                    重新生成
                  </Button>
                  <Button variant="default" size="sm" onClick={handleCopy}>
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
            <CardContent className="space-y-4">
              {/* Chapter List Preview */}
              <div className="rounded-lg bg-muted/50 p-4 font-mono text-sm">
                <pre className="whitespace-pre-wrap">{result.youtube_format}</pre>
              </div>

              {/* Hint */}
              <p className="text-sm text-muted-foreground">
                复制后粘贴到 YouTube 视频描述中，即可自动生成章节时间戳
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
