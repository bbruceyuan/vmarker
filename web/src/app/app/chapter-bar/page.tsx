"use client";

/**
 * [INPUT]: 依赖 chapter-bar 组件、@/lib/api、@/components/ui/*
 * [OUTPUT]: 对外提供 ChapterBarPage 页面组件
 * [POS]: Chapter Bar 功能页面，多步骤向导流程
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Upload, Sparkles, Settings, Download, Loader2, Zap } from "lucide-react";
import Link from "next/link";

import FileUploader from "@/components/chapter-bar/FileUploader";
import ExtractionMode from "@/components/chapter-bar/ExtractionMode";
import ChapterEditor from "@/components/chapter-bar/ChapterEditor";
import ThemeSelector from "@/components/chapter-bar/ThemeSelector";
import VideoGenerator from "@/components/chapter-bar/VideoGenerator";
import { chapterBarApi, type Chapter, type CustomColors } from "@/lib/api";

// ============================================================
// 类型定义
// ============================================================
type Step = "upload" | "extract" | "edit" | "config" | "generate";

interface WizardState {
  file: File | null;
  duration: number;
  chapters: Chapter[];
  theme: string;
  customColors: CustomColors | null;
  videoWidth: number;
  videoHeight: number;
  isQuickMode: boolean;
}

const STEPS: { id: Step; title: string; icon: React.ElementType }[] = [
  { id: "upload", title: "上传字幕", icon: Upload },
  { id: "extract", title: "提取章节", icon: Sparkles },
  { id: "edit", title: "编辑章节", icon: Settings },
  { id: "config", title: "配置样式", icon: Settings },
  { id: "generate", title: "生成视频", icon: Download },
];

// ============================================================
// 页面组件
// ============================================================
export default function ChapterBarPage() {
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [state, setState] = useState<WizardState>({
    file: null,
    duration: 0,
    chapters: [],
    theme: "tech-blue",
    customColors: null,
    videoWidth: 1920,
    videoHeight: 60,
    isQuickMode: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  // Step index
  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Navigation handlers
  const goToStep = useCallback((step: Step) => {
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    }
  }, [currentStepIndex]);

  const goPrev = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex]);

  // State update handlers
  const handleFileUploaded = useCallback((file: File, duration: number) => {
    setState((prev) => ({ ...prev, file, duration, isQuickMode: false }));
    goNext();
  }, [goNext]);

  // Quick generate handler
  const handleQuickGenerate = useCallback(async (file: File, duration: number) => {
    setIsLoading(true);
    setLoadingMessage("正在 AI 智能提取章节...");

    try {
      // AI extract chapters for better results
      const result = await chapterBarApi.extractAI(file);

      // Update state and jump to generate step
      setState((prev) => ({
        ...prev,
        file,
        duration,
        chapters: result.chapters,
        theme: "tech-blue",
        customColors: null,
        videoWidth: 1920,
        videoHeight: 60,
        isQuickMode: true,
      }));

      setCurrentStep("generate");
    } catch (err) {
      console.error("Quick generate failed:", err);
      // Fallback to normal flow
      setState((prev) => ({ ...prev, file, duration, isQuickMode: false }));
      setCurrentStep("extract");
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  }, []);

  const handleChaptersExtracted = useCallback((chapters: Chapter[]) => {
    setState((prev) => ({ ...prev, chapters }));
    goNext();
  }, [goNext]);

  const handleChaptersEdited = useCallback((chapters: Chapter[]) => {
    setState((prev) => ({ ...prev, chapters }));
  }, []);

  const handleConfigChanged = useCallback(
    (config: { theme: string; customColors: CustomColors | null; width: number; height: number }) => {
      setState((prev) => ({
        ...prev,
        theme: config.theme,
        customColors: config.customColors,
        videoWidth: config.width,
        videoHeight: config.height,
      }));
    },
    []
  );

  // Handle going back from generate step in quick mode
  const handleGeneratePrev = useCallback(() => {
    if (state.isQuickMode) {
      // In quick mode, go back to upload and reset
      setState((prev) => ({ ...prev, isQuickMode: false }));
      setCurrentStep("upload");
    } else {
      goPrev();
    }
  }, [state.isQuickMode, goPrev]);

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
          <h1 className="text-2xl font-bold tracking-tight">章节进度条</h1>
          <p className="mt-1 text-muted-foreground">
            将 SRT 字幕转换为章节进度条视频
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => {
                    // 只能跳转到已完成的步骤
                    if (index < currentStepIndex) {
                      goToStep(step.id);
                    }
                  }}
                  disabled={index > currentStepIndex}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    index === currentStepIndex
                      ? "border-primary bg-primary text-primary-foreground"
                      : index < currentStepIndex
                      ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                      : "border-muted bg-muted/30 text-muted-foreground"
                  }`}
                >
                  <step.icon className="h-4 w-4" />
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 w-8 sm:w-12 md:w-16 ${
                      index < currentStepIndex ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            {STEPS.map((step) => (
              <span key={step.id} className="w-10 text-center">
                {step.title}
              </span>
            ))}
          </div>
        </div>

        {/* Loading Overlay for Quick Mode */}
        {isLoading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-lg font-medium">{loadingMessage}</p>
            </div>
          </div>
        )}

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStepIndex].title}</CardTitle>
            <CardDescription>
              {currentStep === "upload" && "上传 SRT 字幕文件"}
              {currentStep === "extract" && "选择章节提取方式"}
              {currentStep === "edit" && "调整章节标题和时间"}
              {currentStep === "config" && "选择配色方案和视频尺寸"}
              {currentStep === "generate" && "生成并下载视频"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === "upload" && (
              <FileUploader
                onUploaded={handleFileUploaded}
                onQuickGenerate={handleQuickGenerate}
              />
            )}

            {currentStep === "extract" && state.file && (
              <ExtractionMode
                file={state.file}
                duration={state.duration}
                onExtracted={handleChaptersExtracted}
              />
            )}

            {currentStep === "edit" && (
              <ChapterEditor
                chapters={state.chapters}
                duration={state.duration}
                onChange={handleChaptersEdited}
                onNext={goNext}
                onPrev={goPrev}
              />
            )}

            {currentStep === "config" && (
              <ThemeSelector
                theme={state.theme}
                customColors={state.customColors}
                width={state.videoWidth}
                height={state.videoHeight}
                onChange={handleConfigChanged}
                onNext={goNext}
                onPrev={goPrev}
              />
            )}

            {currentStep === "generate" && state.file && (
              <VideoGenerator
                chapters={state.chapters}
                duration={state.duration}
                theme={state.theme}
                customColors={state.customColors}
                width={state.videoWidth}
                height={state.videoHeight}
                onPrev={handleGeneratePrev}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
