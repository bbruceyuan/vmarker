"use client";

/**
 * [INPUT]: 依赖 @/components/ui/button, @/components/ui/badge, framer-motion, @/lib/motion
 * [OUTPUT]: 对外提供 HeroSection 组件
 * [POS]: Landing Page 首屏英雄区，展示产品核心价值 + 直观产品预览
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Github, Youtube } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp, staggerContainer } from "@/lib/motion";
import Link from "next/link";

// ============================================================
// 类型定义
// ============================================================
interface Chapter {
  time: string;
  title: string;
  duration: number;
}

// ============================================================
// 章节数据 - 用于展示产品预览
// ============================================================
const chapters: Chapter[] = [
  { time: "00:00", title: "开场介绍", duration: 2.5 },
  { time: "02:30", title: "背景说明", duration: 3.25 },
  { time: "05:45", title: "核心内容", duration: 4.58 },
  { time: "10:20", title: "实战演示", duration: 3.67 },
  { time: "14:00", title: "总结回顾", duration: 2 },
];

const totalDuration = chapters.reduce((sum, c) => sum + c.duration, 0);

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-20 pt-10 md:pb-32 md:pt-16">
      {/* Background - 渐变过渡到下一个 section */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
      </div>

      <motion.div
        className="container mx-auto px-4 sm:px-6 lg:px-8"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Text Content */}
        <div className="mx-auto max-w-3xl text-center">
          <motion.div variants={fadeInUp}>
            <Badge variant="secondary" className="mb-6">
              开源免费 · CLI + Web SaaS
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl"
            variants={fadeInUp}
          >
            让视频结构
            <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
              一目了然
            </span>
          </motion.h1>

          <motion.p
            className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg"
            variants={fadeInUp}
          >
            上传 SRT 字幕，AI 自动识别章节，生成透明进度条视频。
            <br />
            叠加到你的视频上，让观众一眼看清内容结构。
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-3"
            variants={fadeInUp}
          >
            <Button size="lg" className="h-11 gap-2 px-6" asChild>
              <Link href="/app">
                开始使用
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11 gap-2 px-6 cursor-not-allowed opacity-60 relative"
              disabled
            >
              <Youtube className="h-4 w-4 text-red-500" />
              YouTube 章节
              <Badge
                variant="secondary"
                className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0"
              >
                Soon
              </Badge>
            </Button>
            <Button variant="ghost" size="lg" className="h-11 gap-2 px-6" asChild>
              <a href="https://github.com/bbruceyuan/vmarker" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
                GitHub
              </a>
            </Button>
          </motion.div>
        </div>

        {/* Product Preview - 核心亮点 */}
        <motion.div
          className="mx-auto mt-16 max-w-4xl md:mt-20"
          variants={fadeInUp}
        >
          <ProductPreview chapters={chapters} totalDuration={totalDuration} />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ============================================================
// ProductPreview - 直观展示产品效果
// ============================================================
function ProductPreview({
  chapters,
  totalDuration,
}: {
  chapters: Chapter[];
  totalDuration: number;
}) {
  const currentProgress = 0.42; // 42% 位置，模拟播放到第3章中间

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-xl">
      {/* Preview Header */}
      <div className="border-b bg-muted/30 px-6 py-4">
        <p className="text-center text-sm font-medium text-muted-foreground">
          效果预览：自动生成的章节进度条
        </p>
      </div>

      {/* Timeline Progress Bar */}
      <div className="p-6 sm:p-8">
        <div className="relative">
          {/* Progress track */}
          <div className="flex h-12 overflow-hidden rounded-lg border bg-muted/20">
            {chapters.map((chapter, index) => {
              const widthPercent = (chapter.duration / totalDuration) * 100;
              const startPercent = chapters
                .slice(0, index)
                .reduce((sum, c) => sum + (c.duration / totalDuration) * 100, 0);
              const endPercent = startPercent + widthPercent;

              // 判断状态：已播放 / 正在播放 / 未播放
              const isFullyPlayed = endPercent <= currentProgress * 100;
              const isCurrentlyPlaying =
                startPercent < currentProgress * 100 &&
                endPercent > currentProgress * 100;

              // 计算当前章节内的播放比例
              const playedRatio = isCurrentlyPlaying
                ? (currentProgress * 100 - startPercent) / widthPercent
                : 0;

              return (
                <div
                  key={chapter.time}
                  className="relative flex flex-col justify-end border-r border-border/50 last:border-r-0"
                  style={{ width: `${widthPercent}%` }}
                >
                  {/* 未播放背景 */}
                  <div className="absolute inset-0 bg-muted/30" />

                  {/* 已播放填充 */}
                  {isFullyPlayed && (
                    <div className="absolute inset-0 bg-primary/80" />
                  )}

                  {/* 正在播放：分段填充 */}
                  {isCurrentlyPlaying && (
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/80"
                      style={{ width: `${playedRatio * 100}%` }}
                    />
                  )}

                  {/* Time and title */}
                  <div className="relative z-10 px-1 pb-2 pt-3 text-center">
                    <p className={`font-mono text-xs ${
                      isFullyPlayed
                        ? "text-primary-foreground"
                        : "text-muted-foreground"
                    }`}>
                      {chapter.time}
                    </p>
                    <p className={`truncate text-xs font-medium ${
                      isFullyPlayed
                        ? "text-primary-foreground"
                        : "text-foreground/80"
                    }`}>
                      {chapter.title}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chapter List */}
        <div className="mt-6 rounded-lg border bg-muted/20">
          {chapters.map((chapter, index) => {
            const startPercent = chapters
              .slice(0, index)
              .reduce((sum, c) => sum + (c.duration / totalDuration) * 100, 0);
            const endPercent = startPercent + (chapter.duration / totalDuration) * 100;
            const isPlayed = endPercent <= currentProgress * 100;
            const isCurrent = startPercent < currentProgress * 100 && endPercent > currentProgress * 100;

            return (
              <div
                key={chapter.time}
                className={`flex items-center justify-center gap-4 px-4 py-3 ${
                  index !== chapters.length - 1 ? "border-b border-border/50" : ""
                } ${isCurrent ? "bg-primary/10" : ""}`}
              >
                <span className={`font-mono text-sm ${
                  isPlayed ? "text-primary" : isCurrent ? "text-primary font-semibold" : "text-muted-foreground"
                }`}>
                  {chapter.time}
                </span>
                <span className={`text-sm ${
                  isPlayed ? "text-muted-foreground" : isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                }`}>
                  {chapter.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Caption */}
      <div className="border-t bg-muted/20 px-6 py-4">
        <p className="text-center text-sm text-muted-foreground">
          生成透明背景视频 (MOV)，可直接叠加到你的视频上
        </p>
      </div>
    </div>
  );
}
