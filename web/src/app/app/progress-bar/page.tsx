"use client";

/**
 * [INPUT]: 依赖 @/lib/api、@/components/ui/*
 * [OUTPUT]: 对外提供 ProgressBarPage 页面组件
 * [POS]: Progress Bar 功能页面，生成简单进度条视频
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Loader2, Download, Play, Pause } from "lucide-react";
import Link from "next/link";
import { progressBarApi, downloadBlob, type ProgressBarColor } from "@/lib/api";

// ============================================================
// 常量
// ============================================================
const HEIGHT_OPTIONS = [
  { value: 4, label: "4px 细线" },
  { value: 8, label: "8px 标准" },
  { value: 12, label: "12px 粗线" },
];

// ============================================================
// 页面组件
// ============================================================
export default function ProgressBarPage() {
  // 配置状态
  const [duration, setDuration] = useState<string>("60");
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(8);
  const [playedColor, setPlayedColor] = useState("#2563EB");
  const [unplayedColor, setUnplayedColor] = useState("#64748B");
  const [format, setFormat] = useState<"mp4" | "mov">("mp4");

  // 可用配色
  const [colors, setColors] = useState<ProgressBarColor[]>([]);

  // 生成状态
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  // 视频播放状态
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // 加载配色
  useEffect(() => {
    progressBarApi.getColors().then(setColors).catch(console.error);
  }, []);

  // 清理 URL
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // 生成进度条视频
  const handleGenerate = useCallback(async () => {
    const durationNum = parseFloat(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      setError("请输入有效的时长");
      return;
    }
    if (durationNum > 600) {
      setError("视频时长不能超过 10 分钟");
      return;
    }

    setIsLoading(true);
    setError(null);

    // 清理之前的视频
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }

    try {
      const blob = await progressBarApi.generate({
        duration: durationNum,
        width,
        height,
        played_color: playedColor,
        unplayed_color: unplayedColor,
        format,
      });

      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setVideoBlob(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setIsLoading(false);
    }
  }, [duration, width, height, playedColor, unplayedColor, format, videoUrl]);

  // 下载视频
  const handleDownload = useCallback(() => {
    if (videoBlob) {
      const ext = format === "mp4" ? "mp4" : "mov";
      downloadBlob(videoBlob, `progress_bar.${ext}`);
    }
  }, [videoBlob, format]);

  // 视频控制
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  }, []);

  const handleSeek = useCallback((value: number[]) => {
    if (videoRef.current && videoDuration > 0) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  }, [videoDuration]);

  // 选择预设配色
  const selectColor = useCallback((color: ProgressBarColor) => {
    setPlayedColor(color.played);
    setUnplayedColor(color.unplayed);
  }, []);

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
          <h1 className="text-2xl font-bold tracking-tight">播放进度条</h1>
          <p className="mt-1 text-muted-foreground">
            生成简洁的播放进度指示，适合短视频
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Config Card */}
          <Card>
            <CardHeader>
              <CardTitle>配置</CardTitle>
              <CardDescription>设置进度条参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Duration */}
              <div className="space-y-2">
                <Label>视频时长（秒）</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="60"
                  min={1}
                  max={600}
                />
              </div>

              {/* Width */}
              <div className="space-y-2">
                <Label>视频宽度: {width}px</Label>
                <Slider
                  value={[width]}
                  onValueChange={([v]) => setWidth(v)}
                  min={640}
                  max={3840}
                  step={10}
                />
              </div>

              {/* Height */}
              <div className="space-y-2">
                <Label>进度条高度</Label>
                <div className="flex gap-2">
                  {HEIGHT_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={height === opt.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHeight(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-2">
                <Label>配色方案</Label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => selectColor(color)}
                      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors ${
                        playedColor === color.played
                          ? "border-primary bg-primary/10"
                          : "border-muted hover:border-primary/50"
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: color.played }}
                      />
                      {color.display_name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>已播放颜色</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={playedColor}
                      onChange={(e) => setPlayedColor(e.target.value)}
                      className="h-8 w-12 cursor-pointer rounded border"
                    />
                    <Input
                      value={playedColor}
                      onChange={(e) => setPlayedColor(e.target.value)}
                      className="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>未播放颜色</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={unplayedColor}
                      onChange={(e) => setUnplayedColor(e.target.value)}
                      className="h-8 w-12 cursor-pointer rounded border"
                    />
                    <Input
                      value={unplayedColor}
                      onChange={(e) => setUnplayedColor(e.target.value)}
                      className="flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Format */}
              <div className="space-y-2">
                <Label>输出格式</Label>
                <div className="flex gap-2">
                  <Button
                    variant={format === "mp4" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormat("mp4")}
                  >
                    MP4
                  </Button>
                  <Button
                    variant={format === "mov" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormat("mov")}
                  >
                    MOV (透明)
                  </Button>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    生成中...
                  </>
                ) : (
                  "生成进度条视频"
                )}
              </Button>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>预览</CardTitle>
                  <CardDescription>生成的进度条视频</CardDescription>
                </div>
                {videoBlob && (
                  <Button variant="default" size="sm" onClick={handleDownload}>
                    <Download className="mr-1 h-4 w-4" />
                    下载
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {videoUrl ? (
                <div className="space-y-4">
                  {/* Video Preview */}
                  <div className="overflow-hidden rounded-lg bg-muted">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      className="w-full"
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleLoadedMetadata}
                      onEnded={() => setIsPlaying(false)}
                      loop
                    />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={togglePlay}>
                      {isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <Slider
                        value={[currentTime]}
                        onValueChange={handleSeek}
                        max={videoDuration || 100}
                        step={0.1}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {currentTime.toFixed(1)}s / {videoDuration.toFixed(1)}s
                    </span>
                  </div>

                  {/* Preview Bar */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">实际尺寸预览</Label>
                    <div
                      className="relative overflow-hidden rounded"
                      style={{
                        width: "100%",
                        height: `${height}px`,
                        backgroundColor: unplayedColor,
                      }}
                    >
                      <div
                        style={{
                          width: videoDuration > 0 ? `${(currentTime / videoDuration) * 100}%` : "0%",
                          height: "100%",
                          backgroundColor: playedColor,
                          transition: "width 0.1s linear",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">
                    配置参数后点击生成
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
