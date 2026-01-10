/**
 * [INPUT]: 依赖 @/components/ui/card, @/components/ui/badge, lucide-react, next/link
 * [OUTPUT]: 对外提供 AppPage 页面组件
 * [POS]: 工作台入口页，展示可用功能列表
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, FileText, Subtitles, Film, Youtube } from "lucide-react";

// ============================================================
// 功能列表数据
// ============================================================
const features = [
  {
    id: "video",
    title: "视频处理",
    subtitle: "Video Process",
    description: "上传视频，AI 识别字幕，一键生成章节进度条、大纲等",
    icon: Film,
    href: "/app/video",
    badge: "AI",
  },
  {
    id: "chapter-bar",
    title: "章节进度条",
    subtitle: "Chapter Bar",
    description: "将 SRT 字幕转换为章节进度条视频，让观众一眼看清视频结构",
    icon: BarChart3,
    href: "/app/chapter-bar",
  },
  {
    id: "progress-bar",
    title: "播放进度条",
    subtitle: "Progress Bar",
    description: "简洁的播放进度指示，适合短视频",
    icon: TrendingUp,
    href: "/app/progress-bar",
  },
  {
    id: "shownotes",
    title: "视频大纲",
    subtitle: "Shownotes",
    description: "AI 生成结构化视频大纲，支持复制和重新生成",
    icon: FileText,
    href: "/app/shownotes",
  },
  {
    id: "subtitle",
    title: "字幕润色",
    subtitle: "Subtitle Refine",
    description: "AI 修正空耳错误、同音字，提升字幕质量",
    icon: Subtitles,
    href: "/app/subtitle",
  },
  {
    id: "youtube",
    title: "YouTube 章节",
    subtitle: "YouTube Chapters",
    description: "粘贴 YouTube 链接，一键生成视频章节时间戳",
    icon: Youtube,
    href: "/app/youtube",
    badge: "Coming Soon",
    disabled: true,
  },
];

// ============================================================
// 页面组件
// ============================================================
export default function AppPage() {
  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight">选择功能</h1>
          <p className="mt-2 text-muted-foreground">
            选择你需要的视频标记工具
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FeatureCard 组件
// ============================================================
function FeatureCard({
  feature,
}: {
  feature: (typeof features)[number];
}) {
  const isDisabled = "disabled" in feature && feature.disabled;

  const content = (
    <Card className={`group h-full transition-all ${
      isDisabled
        ? "cursor-not-allowed opacity-60"
        : "cursor-pointer hover:border-primary hover:shadow-md"
    }`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className={`rounded-lg bg-primary/10 p-2.5 text-primary transition-colors ${
            !isDisabled && "group-hover:bg-primary group-hover:text-primary-foreground"
          }`}>
            <feature.icon className="h-5 w-5" />
          </div>
          {"badge" in feature && feature.badge && (
            <Badge variant="secondary">{feature.badge}</Badge>
          )}
        </div>
        <CardTitle className="mt-4">
          {feature.title}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {feature.subtitle}
          </span>
        </CardTitle>
        <CardDescription>{feature.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <span className={`text-sm font-medium ${
          isDisabled ? "text-muted-foreground" : "text-primary"
        }`}>
          {isDisabled ? "敬请期待" : "开始使用 →"}
        </span>
      </CardContent>
    </Card>
  );

  if (isDisabled) {
    return content;
  }

  return <Link href={feature.href}>{content}</Link>;
}
