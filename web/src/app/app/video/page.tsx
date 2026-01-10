/**
 * [INPUT]: 依赖 @/lib/api, @/components/ui/*, lucide-react, framer-motion
 * [OUTPUT]: 对外提供 VideoPage 页面组件
 * [POS]: 视频处理页面，两步流程：上传+选择 → 结果
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Video,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  FileText,
  Subtitles,
  Download,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Copy,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

import {
  videoApi,
  chapterBarApi,
  showNotesApi,
  subtitleApi,
  formatTime,
  downloadBlob,
  type VideoUploadResult,
  type Chapter,
  type Theme,
  type ShowNotesResult,
  type PolishResult,
} from "@/lib/api";
import { fadeInUp } from "@/lib/motion";


// ============================================================
// 类型定义
// ============================================================

interface FeatureSelection {
  chapterBar: boolean;
  progressBar: boolean;
  showNotes: boolean;
  subtitle: boolean;
}

interface FeatureConfig {
  position: "top" | "bottom";
  theme: string;
  barHeight: number;
  progressHeight: number;
  playedColor: string;
  unplayedColor: string;
}

interface FeatureResults {
  sourceFile: File;  // 原视频文件，用于对比播放
  chapterBar?: { blob: Blob; chapters: Chapter[] };
  progressBar?: { blob: Blob };
  showNotes?: ShowNotesResult;
  subtitle?: PolishResult;
}


// ============================================================
// 常量
// ============================================================

const MAX_FILE_SIZE_MB = 500;
const MAX_DURATION_SECONDS = 300;
const ALLOWED_EXTENSIONS = [".mp4", ".mov", ".webm", ".mkv", ".avi"];

const FEATURES = [
  {
    key: "chapterBar" as const,
    label: "章节进度条",
    desc: "AI 分析内容，生成章节进度条合成到视频",
    icon: BarChart3,
    outputType: "video" as const,
    needsAsr: true,
    disabled: true,  // ASR 功能暂未就绪
    disabledReason: "ASR 功能开发中",
  },
  {
    key: "progressBar" as const,
    label: "播放进度条",
    desc: "简洁进度条合成到视频",
    icon: TrendingUp,
    outputType: "video" as const,
    needsAsr: false,
    disabled: false,
  },
  {
    key: "showNotes" as const,
    label: "视频大纲",
    desc: "AI 生成结构化大纲，可复制",
    icon: FileText,
    outputType: "text" as const,
    needsAsr: true,
    disabled: true,  // ASR 功能暂未就绪
    disabledReason: "ASR 功能开发中",
  },
  {
    key: "subtitle" as const,
    label: "字幕润色",
    desc: "AI 修正空耳错误，可下载 SRT",
    icon: Subtitles,
    outputType: "text" as const,
    needsAsr: true,
    disabled: true,  // ASR 功能暂未就绪
    disabledReason: "ASR 功能开发中",
  },
];


// ============================================================
// 页面组件
// ============================================================

export default function VideoPage() {
  // 上传状态
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<VideoUploadResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 功能选择
  const [selection, setSelection] = useState<FeatureSelection>({
    chapterBar: false,
    progressBar: true,  // 默认选中（唯一可用的功能）
    showNotes: false,
    subtitle: false,
  });
  const [config, setConfig] = useState<FeatureConfig>({
    position: "bottom",
    theme: "tech-blue",
    barHeight: 60,
    progressHeight: 8,
    playedColor: "#3B82F6",
    unplayedColor: "#E5E7EB",
  });

  // 主题列表
  const [themes, setThemes] = useState<Theme[]>([]);

  // 处理状态
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);

  // 结果
  const [results, setResults] = useState<FeatureResults | null>(null);

  // 错误
  const [error, setError] = useState<string | null>(null);

  // 加载主题列表
  useEffect(() => {
    chapterBarApi.getThemes().then(setThemes).catch(console.error);
  }, []);

  // 页面离开时清理会话
  useEffect(() => {
    const sessionId = uploadResult?.session_id;
    if (!sessionId) return;

    return () => {
      videoApi.cleanup(sessionId).catch(console.error);
    };
  }, [uploadResult?.session_id]);

  // ============================================================
  // 文件处理
  // ============================================================

  const validateFile = useCallback((file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `不支持的格式 (${ext})，支持: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      return `文件过大 (${(file.size / 1024 / 1024).toFixed(1)}MB)，最大 ${MAX_FILE_SIZE_MB}MB`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSelectedFile(file);
    setIsUploading(true);

    try {
      const result = await videoApi.upload(file);

      if (result.duration > MAX_DURATION_SECONDS) {
        setError(`视频时长 ${formatTime(result.duration)} 超出限制 (最大 5 分钟)`);
        await videoApi.cleanup(result.session_id);
        setSelectedFile(null);
        return;
      }
      setUploadResult(result);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err instanceof Error ? err.message : "上传失败");
      setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  }, [validateFile]);

  // ============================================================
  // 拖拽处理
  // ============================================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // ============================================================
  // 处理流程
  // ============================================================

  const handleProcess = useCallback(async () => {
    if (!uploadResult) return;

    const sessionId = uploadResult.session_id;
    const hasSelection = Object.values(selection).some(Boolean);
    if (!hasSelection) {
      setError("请至少选择一个功能");
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProcessingProgress(0);
    const newResults: FeatureResults = {
      sourceFile: selectedFile!,  // 保留原视频用于对比播放
    };

    try {
      // 判断是否需要 ASR
      const needsAsr = selection.chapterBar || selection.showNotes || selection.subtitle;
      let srtContent = "";

      if (needsAsr) {
        setProcessingStep("AI 语音识别中...");
        setProcessingProgress(10);
        const asrResult = await videoApi.asr(sessionId);
        srtContent = asrResult.srt_content;
        setProcessingProgress(40);
      }

      // 创建临时 SRT 文件（用于调用现有 API）
      const srtFile = srtContent
        ? new File([new Blob([srtContent], { type: "text/plain" })], "subtitles.srt")
        : null;

      const totalTasks = Object.values(selection).filter(Boolean).length;
      let completedTasks = 0;
      const progressBase = needsAsr ? 40 : 10;
      const progressPerTask = (90 - progressBase) / totalTasks;

      // Chapter Bar
      if (selection.chapterBar && srtFile) {
        setProcessingStep("生成章节进度条...");
        const chapterResult = await chapterBarApi.extractAI(srtFile);
        const blob = await videoApi.compose(sessionId, {
          feature: "chapter-bar",
          position: config.position,
          chapters: chapterResult.chapters,
          theme: config.theme,
          bar_height: config.barHeight,
        });
        newResults.chapterBar = { blob, chapters: chapterResult.chapters };
        completedTasks++;
        setProcessingProgress(progressBase + progressPerTask * completedTasks);
      }

      // Progress Bar
      if (selection.progressBar) {
        setProcessingStep("生成进度条...");
        const blob = await videoApi.compose(sessionId, {
          feature: "progress-bar",
          position: config.position,
          played_color: config.playedColor,
          unplayed_color: config.unplayedColor,
          progress_height: config.progressHeight,
        });
        newResults.progressBar = { blob };
        completedTasks++;
        setProcessingProgress(progressBase + progressPerTask * completedTasks);
      }

      // Show Notes
      if (selection.showNotes && srtFile) {
        setProcessingStep("生成视频大纲...");
        newResults.showNotes = await showNotesApi.generate(srtFile);
        completedTasks++;
        setProcessingProgress(progressBase + progressPerTask * completedTasks);
      }

      // Subtitle
      if (selection.subtitle && srtFile) {
        setProcessingStep("润色字幕...");
        newResults.subtitle = await subtitleApi.polish(srtFile);
        completedTasks++;
        setProcessingProgress(progressBase + progressPerTask * completedTasks);
      }

      setProcessingProgress(100);
      setResults(newResults);
    } catch (err) {
      console.error("Process error:", err);
      setError(err instanceof Error ? err.message : "处理失败");
    } finally {
      setIsProcessing(false);
      setProcessingStep("");
    }
  }, [uploadResult, selection, config]);

  // ============================================================
  // 重置
  // ============================================================

  const handleReset = useCallback(async () => {
    if (uploadResult) {
      await videoApi.cleanup(uploadResult.session_id).catch(console.error);
    }
    setUploadResult(null);
    setSelectedFile(null);
    setResults(null);
    setError(null);
    setProcessingProgress(0);
  }, [uploadResult]);

  // ============================================================
  // 渲染
  // ============================================================

  const hasSelection = Object.values(selection).some(Boolean);
  const hasComposeSelection = selection.chapterBar || selection.progressBar;

  // 结果页面
  if (results) {
    return (
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          {/* 返回导航 */}
          <div className="mb-8">
            <Link
              href="/app"
              className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              返回功能列表
            </Link>
          </div>
          <ResultView results={results} onReset={handleReset} />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/app"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回功能列表
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">视频处理</h1>
          <p className="mt-2 text-muted-foreground">
            上传视频，选择功能，一键生成
          </p>
        </div>

        {/* 错误提示 */}
        <AnimatePresence>
          {error && (
            <motion.div {...fadeInUp} className="mb-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 处理中遮罩 */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            >
              <Card className="w-80">
                <CardContent className="pt-6 text-center">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                  <p className="mt-4 font-medium">{processingStep}</p>
                  <Progress value={processingProgress} className="mt-4" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {Math.round(processingProgress)}%
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <Card>
          <CardHeader>
            <CardTitle>上传视频</CardTitle>
            <CardDescription>
              支持 MP4, MOV, WebM 等格式，≤500MB，≤5 分钟
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 上传区域 */}
            <div
              className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : uploadResult
                  ? "border-green-500 bg-green-500/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_EXTENSIONS.join(",")}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />

              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="font-medium">上传中...</p>
                </div>
              ) : uploadResult ? (
                <div className="space-y-3">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
                  <p className="font-medium text-green-600">{selectedFile?.name}</p>
                  <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                    <span>时长: {formatTime(uploadResult.duration)}</span>
                    <span>分辨率: {uploadResult.width}×{uploadResult.height}</span>
                    <span>大小: {uploadResult.file_size_mb.toFixed(1)}MB</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    重新选择
                  </Button>
                </div>
              ) : (
                <>
                  <Video className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 font-medium">拖拽视频到这里，或点击选择</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {ALLOWED_EXTENSIONS.join(", ")}
                  </p>
                </>
              )}
            </div>

            {/* 功能选择 */}
            {uploadResult && (
              <div className="space-y-4">
                <h3 className="font-medium">选择功能</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {FEATURES.map((f) => (
                    <div
                      key={f.key}
                      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                        f.disabled
                          ? "cursor-not-allowed opacity-50"
                          : selection[f.key]
                          ? "cursor-pointer border-primary bg-primary/5"
                          : "cursor-pointer hover:border-primary/50"
                      }`}
                      onClick={() => {
                        if (!f.disabled) {
                          setSelection({ ...selection, [f.key]: !selection[f.key] });
                        }
                      }}
                    >
                      <Checkbox
                        checked={selection[f.key]}
                        disabled={f.disabled}
                        onCheckedChange={(checked) => {
                          if (!f.disabled) {
                            setSelection({ ...selection, [f.key]: !!checked });
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <f.icon className="h-4 w-4 shrink-0" />
                          <span className="font-medium">{f.label}</span>
                          {f.outputType === "video" && (
                            <Badge variant="outline" className="text-xs shrink-0">合成</Badge>
                          )}
                          {f.disabled && (
                            <Badge variant="secondary" className="text-xs shrink-0">开发中</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {f.disabled ? f.disabledReason : f.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 合成配置 */}
                {hasComposeSelection && (
                  <div className="space-y-3 rounded-lg border p-4">
                    <h4 className="text-sm font-medium">合成配置</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">位置</Label>
                        <Select
                          value={config.position}
                          onValueChange={(v) =>
                            setConfig({ ...config, position: v as "top" | "bottom" })
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bottom">
                              <span className="flex items-center gap-2">
                                <ArrowDown className="h-3 w-3" /> 底部
                              </span>
                            </SelectItem>
                            <SelectItem value="top">
                              <span className="flex items-center gap-2">
                                <ArrowUp className="h-3 w-3" /> 顶部
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {selection.chapterBar && themes.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">配色</Label>
                          <Select
                            value={config.theme}
                            onValueChange={(v) => setConfig({ ...config, theme: v })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {themes.map((t) => (
                                <SelectItem key={t.name} value={t.name}>
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="h-3 w-3 rounded-full"
                                      style={{ backgroundColor: t.played_bg }}
                                    />
                                    {t.display_name}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 开始处理按钮 */}
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!hasSelection || isProcessing}
                  onClick={handleProcess}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  开始处理
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


// ============================================================
// 视频播放器组件
// ============================================================

function VideoPlayer({ src, label }: { src: string; label: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <video
        src={src}
        controls
        className="w-full rounded-lg bg-black aspect-video"
        preload="metadata"
      />
    </div>
  );
}


// ============================================================
// 视频对比组件
// ============================================================

function VideoCompare({
  sourceFile,
  resultBlob,
  resultLabel,
}: {
  sourceFile: File;
  resultBlob: Blob;
  resultLabel: string;
}) {
  const [urls, setUrls] = useState<{ source: string; result: string } | null>(null);

  useEffect(() => {
    // 创建 blob URL
    const source = URL.createObjectURL(sourceFile);
    const result = URL.createObjectURL(resultBlob);
    setUrls({ source, result });

    // 组件卸载时清理
    return () => {
      URL.revokeObjectURL(source);
      URL.revokeObjectURL(result);
    };
  }, [sourceFile, resultBlob]);

  if (!urls) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="aspect-video rounded-lg bg-muted animate-pulse" />
        <div className="aspect-video rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <VideoPlayer src={urls.source} label="原视频" />
      <VideoPlayer src={urls.result} label={resultLabel} />
    </div>
  );
}


// ============================================================
// 结果展示组件
// ============================================================

function ResultView({
  results,
  onReset,
}: {
  results: FeatureResults;
  onReset: () => void;
}) {
  const [copiedShowNotes, setCopiedShowNotes] = useState(false);

  // 获取有效的结果 keys（排除 sourceFile）
  const resultKeys = (Object.keys(results) as (keyof FeatureResults)[]).filter(
    (key) => key !== "sourceFile" && results[key] !== undefined
  );
  const defaultTab = resultKeys[0] || "chapterBar";

  const copyShowNotes = useCallback(() => {
    if (!results.showNotes) return;
    const text = `## 摘要\n${results.showNotes.summary}\n\n## 大纲\n${results.showNotes.outline
      .map((item) => `- ${formatTime(item.timestamp)} ${item.title}`)
      .join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopiedShowNotes(true);
    setTimeout(() => setCopiedShowNotes(false), 2000);
  }, [results.showNotes]);

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <CardTitle>处理完成</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              处理新视频
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab}>
            <TabsList className="mb-4">
              {results.chapterBar && (
                <TabsTrigger value="chapterBar">
                  <BarChart3 className="mr-1.5 h-4 w-4" />
                  Chapter Bar
                </TabsTrigger>
              )}
              {results.progressBar && (
                <TabsTrigger value="progressBar">
                  <TrendingUp className="mr-1.5 h-4 w-4" />
                  Progress Bar
                </TabsTrigger>
              )}
              {results.showNotes && (
                <TabsTrigger value="showNotes">
                  <FileText className="mr-1.5 h-4 w-4" />
                  大纲
                </TabsTrigger>
              )}
              {results.subtitle && (
                <TabsTrigger value="subtitle">
                  <Subtitles className="mr-1.5 h-4 w-4" />
                  字幕
                </TabsTrigger>
              )}
            </TabsList>

            {/* Chapter Bar - 视频对比 */}
            {results.chapterBar && (
              <TabsContent value="chapterBar" className="space-y-4">
                <VideoCompare
                  sourceFile={results.sourceFile}
                  resultBlob={results.chapterBar.blob}
                  resultLabel="合成后视频"
                />
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="mb-2 text-sm font-medium">章节列表</h4>
                  <div className="space-y-1 text-sm">
                    {results.chapterBar.chapters.map((ch, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="truncate mr-4">{ch.title}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {formatTime(ch.start_time)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() =>
                    downloadBlob(results.chapterBar!.blob, "chapter_bar_video.mp4")
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  下载合成视频
                </Button>
              </TabsContent>
            )}

            {/* Progress Bar - 视频对比 */}
            {results.progressBar && (
              <TabsContent value="progressBar" className="space-y-4">
                <VideoCompare
                  sourceFile={results.sourceFile}
                  resultBlob={results.progressBar.blob}
                  resultLabel="合成后视频"
                />
                <Button
                  onClick={() =>
                    downloadBlob(results.progressBar!.blob, "progress_bar_video.mp4")
                  }
                >
                  <Download className="mr-2 h-4 w-4" />
                  下载合成视频
                </Button>
              </TabsContent>
            )}

            {/* Show Notes */}
            {results.showNotes && (
              <TabsContent value="showNotes" className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="mb-2 text-sm font-medium">摘要</h4>
                  <p className="text-sm">{results.showNotes.summary}</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="mb-2 text-sm font-medium">大纲</h4>
                  <div className="space-y-1 text-sm">
                    {results.showNotes.outline.map((item, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="shrink-0 text-muted-foreground">
                          {formatTime(item.timestamp)}
                        </span>
                        <span>{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={copyShowNotes}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copiedShowNotes ? "已复制" : "复制到剪贴板"}
                </Button>
              </TabsContent>
            )}

            {/* Subtitle */}
            {results.subtitle && (
              <TabsContent value="subtitle" className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm">
                    共修改 <span className="font-medium">{results.subtitle.changes_count}</span> 处
                  </p>
                </div>
                {results.subtitle.changes_count > 0 && (
                  <div className="max-h-64 overflow-y-auto rounded-lg border p-3 text-sm">
                    {results.subtitle.subtitles
                      .filter((s) => s.changed)
                      .slice(0, 20)
                      .map((s) => (
                        <div key={s.index} className="mb-2 pb-2 border-b last:border-0">
                          <div className="text-muted-foreground line-through">
                            {s.original_text}
                          </div>
                          <div className="text-green-600">{s.polished_text}</div>
                        </div>
                      ))}
                  </div>
                )}
                <Button
                  onClick={() => {
                    const blob = new Blob([results.subtitle!.srt_content], {
                      type: "text/plain",
                    });
                    downloadBlob(blob, "polished.srt");
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  下载 SRT
                </Button>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
