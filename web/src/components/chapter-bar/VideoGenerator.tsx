"use client";

/**
 * [INPUT]: 依赖 @/lib/api, @/components/ui/*
 * [OUTPUT]: 对外提供 VideoGenerator 组件
 * [POS]: Chapter Bar 视频生成和下载组件，支持在线预览
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Download, Loader2, CheckCircle2, AlertCircle, RotateCcw, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { chapterBarApi, downloadBlob, formatTime, type Chapter } from "@/lib/api";

interface VideoGeneratorProps {
  chapters: Chapter[];
  duration: number;
  theme: string;
  customColors?: { played_bg: string; unplayed_bg: string } | null;
  width: number;
  height: number;
  onPrev: () => void;
}

type GenerateStatus = "idle" | "generating" | "success" | "error";
type VideoFormat = "mp4" | "mov";

export default function VideoGenerator({
  chapters,
  duration,
  theme,
  customColors,
  width,
  height,
  onPrev,
}: VideoGeneratorProps) {
  const [status, setStatus] = useState<GenerateStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [format, setFormat] = useState<VideoFormat>("mp4");
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 清理 Object URL
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // 生成视频
  const handleGenerate = useCallback(async () => {
    setStatus("generating");
    setProgress(0);
    setError(null);

    // 清理之前的视频
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
      setVideoBlob(null);
    }

    // 模拟进度
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 10, 90));
    }, 500);

    try {
      const blob = await chapterBarApi.generate(
        chapters,
        duration,
        { width, height },
        theme,
        format,
        customColors
      );
      clearInterval(progressInterval);
      setProgress(100);
      setVideoBlob(blob);
      setVideoUrl(URL.createObjectURL(blob));
      setStatus("success");
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : "生成视频失败");
      setStatus("error");
    }
  }, [chapters, duration, width, height, theme, format, customColors, videoUrl]);

  // 下载视频（直接下载已生成的文件）
  const handleDownload = useCallback(() => {
    if (videoBlob) {
      const ext = format === "mp4" ? "mp4" : "mov";
      const filename = `chapter-bar-${Date.now()}.${ext}`;
      downloadBlob(videoBlob, filename);
    }
  }, [videoBlob, format]);

  // 重新生成
  const handleRegenerate = useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setError(null);
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
      setVideoBlob(null);
    }
    setIsPlaying(false);
    setCurrentTime(0);
  }, [videoUrl]);

  // 播放控制
  const togglePlayback = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // 视频结束时重置
  const handleVideoEnded = useCallback(() => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  }, []);

  // 视频时间更新
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  // 视频加载完成
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  }, []);

  // 进度条拖动
  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current && videoDuration > 0) {
      const newTime = (value[0] / 100) * videoDuration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [videoDuration]);

  // 格式化视频时间
  const formatVideoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-lg border bg-muted/20 p-4">
        <h3 className="font-medium">生成配置</h3>
        <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <div>章节数量: {chapters.length} 个</div>
          <div>视频时长: {formatTime(duration)}</div>
          <div>视频尺寸: {width} × {height}</div>
          <div>配色方案: {customColors ? "自定义配色" : theme}</div>
        </div>
      </div>

      {/* Format Selection */}
      {status === "idle" && (
        <div className="rounded-lg border bg-muted/20 p-4">
          <h3 className="mb-3 font-medium">输出格式</h3>
          <RadioGroup
            value={format}
            onValueChange={(v) => setFormat(v as VideoFormat)}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="mp4" id="mp4" className="mt-1" />
              <Label htmlFor="mp4" className="cursor-pointer">
                <div className="font-medium">MP4（推荐）</div>
                <div className="text-sm text-muted-foreground">
                  通用格式，文件小，适合大多数场景
                </div>
              </Label>
            </div>
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="mov" id="mov" className="mt-1" />
              <Label htmlFor="mov" className="cursor-pointer">
                <div className="font-medium">MOV（透明背景）</div>
                <div className="text-sm text-muted-foreground">
                  PNG 编码，支持透明，适合专业剪辑软件叠加
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {/* Status Display */}
      {status === "idle" && (
        <div className="text-center">
          <p className="text-muted-foreground">
            点击下方按钮开始生成章节进度条视频
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            预计需要 {Math.ceil(duration / 10)} 秒
          </p>
        </div>
      )}

      {status === "generating" && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="font-medium">正在生成视频...</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-center text-sm text-muted-foreground">
            {Math.round(progress)}% 完成
          </p>
        </div>
      )}

      {status === "success" && videoUrl && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">视频生成成功！</span>
          </div>

          {/* Video Preview */}
          {format === "mp4" ? (
            <div className="overflow-hidden rounded-lg border bg-muted/30">
              <div className="relative">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="mx-auto block"
                  style={{ maxWidth: "100%", height: "auto" }}
                  onEnded={handleVideoEnded}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  loop={false}
                  playsInline
                />
                {/* Play overlay */}
                <button
                  onClick={togglePlayback}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity hover:bg-black/30"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg">
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" />
                    )}
                  </div>
                </button>
              </div>
              {/* Custom Controls */}
              <div className="border-t bg-muted/20 px-4 py-3 space-y-2">
                {/* Progress Slider */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-10">
                    {formatVideoTime(currentTime)}
                  </span>
                  <Slider
                    value={[videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0]}
                    onValueChange={handleSeek}
                    max={100}
                    step={0.1}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-10">
                    {formatVideoTime(videoDuration)}
                  </span>
                </div>
                <div className="text-center text-xs text-muted-foreground">
                  拖动进度条可跳转 · {width} × {height} 像素 · MP4 格式
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/20 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                MOV 格式不支持浏览器预览，请下载后在本地播放
              </p>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {format === "mp4"
              ? "预览满意？点击下载按钮保存视频"
              : "点击下载按钮保存透明背景视频"}
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <span className="font-medium">生成失败</span>
          </div>
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap justify-between gap-2">
        <Button
          variant="outline"
          onClick={onPrev}
          disabled={status === "generating"}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          上一步
        </Button>

        <div className="flex gap-2">
          {status === "idle" && (
            <Button onClick={handleGenerate}>
              开始生成
            </Button>
          )}

          {status === "generating" && (
            <Button disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              生成中...
            </Button>
          )}

          {status === "success" && (
            <>
              <Button variant="outline" onClick={handleRegenerate}>
                <RotateCcw className="mr-2 h-4 w-4" />
                重新生成
              </Button>
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                下载 {format.toUpperCase()}
              </Button>
            </>
          )}

          {status === "error" && (
            <Button onClick={handleRegenerate}>
              <RotateCcw className="mr-2 h-4 w-4" />
              重试
            </Button>
          )}
        </div>
      </div>

      {/* Usage Tips */}
      {status === "success" && (
        <div className="rounded-lg border bg-muted/20 p-4">
          <h4 className="font-medium">使用说明</h4>
          <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            {format === "mp4" ? (
              <>
                <li>下载 .mp4 视频文件</li>
                <li>在剪辑软件中导入原视频和章节进度条</li>
                <li>将章节进度条放到上层轨道</li>
                <li>调整位置和混合模式</li>
                <li>导出最终视频</li>
              </>
            ) : (
              <>
                <li>下载 .mov 视频文件（透明背景）</li>
                <li>在专业剪辑软件中导入原视频</li>
                <li>将章节进度条放到最上层轨道</li>
                <li>调整位置（通常放在顶部或底部）</li>
                <li>导出最终视频</li>
              </>
            )}
          </ol>
        </div>
      )}
    </div>
  );
}
